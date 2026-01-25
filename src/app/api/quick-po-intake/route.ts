import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { nowIso } from "@/lib/supabase/utils";
import { v4 as uuidv4 } from "uuid";

// Optimized local implementation to avoid import issues
const addPurchaseOrderLocal = async (orderData: any): Promise<string> => {
  try {
    const supabase = getSupabaseServerClient();
    const firestoreId = uuidv4();
    const timestamp = nowIso();

    const payload = {
      orderNumber: orderData.orderNumber,
      supplier: orderData.supplier,
      totalAmount: Number(orderData.totalAmount) || 0,
      status: orderData.status,
      items: orderData.items ?? [],
      shipping: orderData.shippingInfo ?? {}, // Changed from shippingInfo to shipping
      createdBy: 'System User', // Added createdBy field
      orderDate: timestamp, // Added orderDate field
      history: orderData.history ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { data, error } = await supabase.from("purchase_orders").insert(payload).select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data?.[0]?.id;
  } catch (error) {
    throw new Error(`Failed to add purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export async function POST(request: Request) {
  console.log("Quick PO intake API called");

  try {
    const body = await request.json();
    console.log("Request body parsed", { bodyKeys: Object.keys(body) });

    const { action } = body as { action?: string };
    console.log("Action extracted", { action });

    switch (action) {
      case "searchProducts": {
        const { query } = body as { query: string };
        const normalized = query?.trim() ?? "";

        if (!normalized) {
          return NextResponse.json({ products: [] });
        }

        const supabase = getSupabaseServerClient();

        // Optimized search with better filtering
        const tokens = normalized
          .toLowerCase()
          .split(/\s+/)
          .filter((token) => token.length > 1)
          .slice(0, 3);

        const searchFilter = tokens.length > 0
          ? tokens.map(token => `name.ilike.%${token}%`).join(",")
          : `name.ilike.%${normalized}%`;

        const { data, error } = await supabase
          .from("products")
          .select("id,name,sku,price,cost,stock,type,ownershipType,consignorId,reorderPoint")
          .or(searchFilter)
          .order('stock', { ascending: false })
          .limit(20);

        if (error) {
          throw new Error(`Search error: ${error.message}`);
        }

        const products = (data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name ?? "",
          sku: row.sku ?? "",
          price: Number(row.price ?? 0),
          cost: Number(row.cost ?? 0),
          stock: Number(row.stock ?? 0),
          type: row.type ?? "Venta",
          ownershipType: row.ownershipType ?? "Propio",
          consignorId: row.consignorId ?? undefined,
          reorderPoint: row.reorderPoint ?? undefined,
          createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        }));

        return NextResponse.json({ products });
      }

      case "listSuppliers": {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
          .from("suppliers")
          .select("id,name,totalPurchasedYTD,contactInfo,notes")
          .order('totalPurchasedYTD', { ascending: false })
          .limit(50);

        if (error) {
          throw new Error(`Suppliers error: ${error.message}`);
        }

        const suppliers = (data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name ?? "",
          totalPurchasedYTD: Number(row.totalPurchasedYTD ?? 0),
          contactInfo: row.contactInfo ?? "",
          notes: row.notes ?? "",
        }));

        return NextResponse.json({ suppliers });
      }

      case "savePurchaseOrder": {
        console.log("Processing savePurchaseOrder");

        const {
          supplier,
          orderNumber,
          status,
          totalAmount,
          notes,
          shipping,
          items,
          history,
        } = body;

        console.log("Data extracted", { supplier, orderNumber, status, totalAmount });

        // Validate required fields
        if (!supplier || !orderNumber || !status) {
          return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
        }

        const payload = {
          supplier,
          orderNumber,
          status,
          totalAmount: Number(totalAmount) || 0,
          shipping: shipping, // Changed from shippingInfo to shipping
          createdBy: 'System User', // Added createdBy field
          orderDate: nowIso(), // Added orderDate field
          items: items || [],
          history: history || [],
        };

        console.log("Calling addPurchaseOrder");

        try {
          const orderId = await addPurchaseOrderLocal(payload);
          console.log("Purchase order saved successfully", { orderId });
          return NextResponse.json({
            order: {
              id: orderId,
              ...payload,
              createdAt: new Date().toISOString()
            }
          });
        } catch (purchaseError) {
          console.error("Error saving purchase order", purchaseError);
          throw purchaseError;
        }
      }

      case "confirmArrival": {
        const { items, userId, purchaseOrderId } = body as {
          items: any[];
          userId: string;
          purchaseOrderId: string;
        };

        if (!items || !Array.isArray(items) || items.length === 0) {
          return NextResponse.json({ error: "No items provided" }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();
        const results = [];

        for (const item of items) {
          try {
            // Update existing product or create new one
            if (item.productId) {
              // Update existing product stock
              const { data: product, error: fetchError } = await supabase
                .from("products")
                .select("id,stock")
                .eq("id", item.productId)
                .maybeSingle();

              if (fetchError) {
                throw fetchError;
              }

              if (product) {
                const newStock = Number(product.stock ?? 0) + (item.qty ?? 0);
                const { error: updateError } = await supabase
                  .from("products")
                  .update({ stock: newStock, lastUpdated: nowIso() })
                  .eq("id", product.id);

                if (updateError) {
                  throw updateError;
                }

                // Record inventory movement
                await supabase.from("inventory_logs").insert({
                  productId: product.id,
                  productName: item.productName || item.rawName,
                  change: item.qty ?? 0,
                  reason: "Ingreso de Mercancía",
                  updatedBy: userId || "system",
                  createdAt: nowIso(),
                  metadata: {
                    purchaseOrderId,
                    cost: item.finalCost || item.cost || 0,
                  },
                });

                results.push({ success: true, productId: product.id, newStock });
              }
            } else {
              // Create new product
              const timestamp = nowIso();
              const { data: newProduct, error: insertError } = await supabase.from("products").insert({
                name: item.productName || item.rawName,
                sku: item.productId || `AUTO-${Date.now()}`,
                stock: item.qty,
                price: item.salePrice ?? 0,
                cost: item.finalCost ?? item.cost ?? 0,
                category: "Compras",
                createdAt: timestamp,
                lastUpdated: timestamp,
              }).select().maybeSingle();

              if (insertError) {
                throw insertError;
              }

              results.push({ success: true, productId: newProduct.id, newStock: item.qty });
            }
          } catch (itemError) {
            console.error(`Error processing item ${item.productId}:`, itemError);
            results.push({ success: false, error: itemError instanceof Error ? itemError.message : 'Unknown error', item });
          }
        }

        return NextResponse.json({
          success: true,
          results,
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        });
      }

      case "createSupplier": {
        const { name, contactInfo, notes } = body as {
          name: string;
          contactInfo?: string;
          notes?: string;
        };

        if (!name || !name.trim()) {
          return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
        }

        const supabase = getSupabaseServerClient();
        const timestamp = nowIso();

        const { data, error } = await supabase.from("suppliers").insert({
          name: name.trim(),
          contactInfo: contactInfo ?? "",
          notes: notes ?? "",
          totalPurchasedYTD: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        }).select().maybeSingle();

        if (error) {
          throw new Error(`Failed to create supplier: ${error.message}`);
        }

        return NextResponse.json({ supplier: data });
      }

      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Quick PO intake API error", error);
    return NextResponse.json({
      error: "Error procesando la petición",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
