import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { nowIso } from "@/lib/supabase/utils";
import { getSuppliers } from "@/lib/services/supplierService";
import { addPurchaseOrder } from "@/lib/services/purchaseOrderService";
import { getLogger } from "@/lib/logger";
import type { Supplier, Product } from "@/types";

const log = getLogger("quickPoIntakeApi");

// Simple test function
const testBasicConnection = async () => {
  try {
    console.log("Testing basic connection...");
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from('purchase_orders').select('count', { count: 'exact', head: true });
    if (error) {
      console.error("Basic connection test failed:", error);
      throw error;
    }
    console.log("Basic connection test passed");
    return true;
  } catch (error) {
    console.error("Basic connection test error:", error);
    throw error;
  }
};

interface ParsedItemPayload {
  qty: number;
  rawName: string;
  productId?: string;
  productName?: string;
  cost?: number;
  salePrice?: number;
  allocatedShippingPerUnit?: number;
  totalAllocatedShipping?: number;
  finalCost?: number;
}

const buildOrFilter = (column: string, tokens: string[]) => {
  if (!tokens.length) return ``;
  return tokens.map((token) => `${column}.ilike.%${token}%`).join(",");
};

const fetchProductById = async (supabase: ReturnType<typeof getSupabaseServerClient>, productId: string) => {
  const { data, error } = await supabase
    .from("products")
    .select("firestore_id,id,stock,cost,price,name,sku")
    .or(`firestore_id.eq.${productId},id.eq.${productId}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const incrementSupplierTotal = async (
  supabase: ReturnType<typeof getSupabaseServerClient>,
  supplierName: string,
  amount: number
) => {
  if (!supplierName.trim() || amount <= 0) {
    return;
  }

  const { data: existing, error } = await supabase
    .from("suppliers")
    .select("firestore_id,totalPurchasedYTD")
    .eq("name", supplierName.trim())
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existing) {
    const newTotal = Number(existing.totalPurchasedYTD ?? 0) + amount;
    const { error: updateError } = await supabase
      .from("suppliers")
      .update({ totalPurchasedYTD: newTotal, updatedAt: nowIso() })
      .eq("firestore_id", existing.firestore_id ?? supplierName.trim());

    if (updateError) {
      throw updateError;
    }
  } else {
    const timestamp = nowIso();
    const { error: insertError } = await supabase.from("suppliers").insert({
      firestore_id: uuidv4(),
      name: supplierName.trim(),
      contactInfo: "",
      notes: "Proveedor creado automáticamente desde orden de compra",
      totalPurchasedYTD: amount,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    if (insertError) {
      throw insertError;
    }
  }
};

const recordInventoryMovement = async (
  supabase: ReturnType<typeof getSupabaseServerClient>,
  params: {
    product: any;
    quantity: number;
    userId: string;
    purchaseOrderId: string;
    cost?: number;
  }
) => {
  const { product, quantity, userId, purchaseOrderId, cost } = params;
  const { error } = await supabase.from("inventory_logs").insert({
    firestore_id: uuidv4(),
    productId: product.firestore_id ?? product.id,
    productName: product.name ?? "",
    change: quantity,
    reason: "Ingreso de Mercancía",
    updatedBy: userId,
    createdAt: nowIso(),
    metadata: {
      purchaseOrderId,
      cost: cost ?? product.cost ?? 0,
    },
  });

  if (error) {
    throw error;
  }
};

const upsertInventoryItem = async (
  supabase: ReturnType<typeof getSupabaseServerClient>,
  item: ParsedItemPayload
) => {
  const timestamp = nowIso();
  const { error } = await supabase.from("products").insert({
    firestore_id: uuidv4(),
    name: item.productName || item.rawName,
    sku: item.productId || `AUTO-${Date.now()}`,
    stock: item.qty,
    price: item.salePrice ?? 0,
    cost: item.finalCost ?? item.cost ?? 0,
    category: "Compras",
    createdAt: timestamp,
    lastUpdated: timestamp,
  });

  if (error) {
    throw error;
  }
};

const applyInventoryAdjustments = async (
  supabase: ReturnType<typeof getSupabaseServerClient>,
  items: ParsedItemPayload[],
  userId: string,
  purchaseOrderId: string
) => {
  for (const item of items) {
    if (item.productId) {
      const product = await fetchProductById(supabase, item.productId);
      if (!product) {
        continue;
      }

      const newStock = Number(product.stock ?? 0) + (item.qty ?? 0);
      const { error: updateProductError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("firestore_id", product.firestore_id ?? product.id);

      if (updateProductError) {
        throw updateProductError;
      }

      await recordInventoryMovement(supabase, {
        product,
        quantity: item.qty ?? 0,
        userId,
        purchaseOrderId,
        cost: item.finalCost ?? item.cost,
      });
    } else {
      await upsertInventoryItem(supabase, item);
    }
  }
};

export async function POST(request: Request) {
  console.log("Quick PO intake API called");
  
  try {
    return NextResponse.json({ message: "API is working" });
    
    /*
    // Test basic connection first
    await testBasicConnection();
    */
    
    const supabase = getSupabaseServerClient();
    console.log("Supabase client created successfully");
    
    const body = await request.json();
    console.log("Request body parsed successfully", { bodyKeys: Object.keys(body) });
    
    const { action } = body as { action?: string };
    console.log("Action extracted", { action });

    switch (action) {
      case "searchProducts": {
        const { query } = body as { query: string };
        const normalized = query?.trim() ?? "";
        if (!normalized) {
          return NextResponse.json({ products: [] });
        }

        const tokens = normalized
          .toLowerCase()
          .split(/\s+/)
          .filter((token) => token.length > 1)
          .slice(0, 3);

        const filter = buildOrFilter("name", tokens.length ? tokens : [normalized]);
        const { data, error } = await supabase
          .from("products")
          .select("firestore_id,id,name,sku,price,cost,stock,type,ownershipType,consignorId,reorderPoint,comboProductIds,compatibilityTags")
          .or(filter || "");

        if (error) {
          throw error;
        }

        const products: Product[] = (data ?? []).map((row: any) => ({
          id: row.firestore_id ?? row.id,
          name: row.name ?? "",
          sku: row.sku ?? "",
          price: Number(row.price ?? 0),
          cost: Number(row.cost ?? 0),
          stock: Number(row.stock ?? 0),
          createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
          type: row.type ?? "Venta",
          ownershipType: row.ownershipType ?? "Propio",
          consignorId: row.consignorId ?? undefined,
          reorderPoint: row.reorderPoint ?? undefined,
          comboProductIds: row.comboProductIds ?? [],
          compatibilityTags: row.compatibilityTags ?? [],
          searchKeywords: [],
        }));

        return NextResponse.json({ products });
      }

      case "listSuppliers": {
        const suppliers: Supplier[] = await getSuppliers();
        return NextResponse.json({ suppliers });
      }

      case "savePurchaseOrder": {
        log.info("Processing savePurchaseOrder request", { bodyKeys: Object.keys(body) });
        
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

        log.info("Extracted data", { 
          supplier, 
          orderNumber, 
          status, 
          totalAmount, 
          itemsCount: items?.length || 0,
          historyCount: history?.length || 0
        });

        // Validate required fields
        if (!supplier || !orderNumber || !status) {
          log.error("Missing required fields", { supplier, orderNumber, status });
          return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
        }

        const payload = {
          supplier,
          orderNumber,
          status,
          totalAmount: Number(totalAmount) || 0,
          shippingInfo: shipping,
          notes,
          items: items || [],
          history: history || [],
        };

        log.info("Calling addPurchaseOrder with payload", { payloadKeys: Object.keys(payload) });

        try {
          const order = await addPurchaseOrder(payload as any);
          log.info("Purchase order saved successfully", { orderNumber });
          
          if (status === "ordered" && Number(totalAmount ?? 0) > 0) {
            log.info("Incrementing supplier total", { supplier, amount: totalAmount });
            await incrementSupplierTotal(supabase, supplier, Number(totalAmount));
          }

          return NextResponse.json({ order });
        } catch (purchaseError) {
          log.error("Error in addPurchaseOrder", purchaseError);
          throw purchaseError;
        }
      }

      case "confirmArrival": {
        const { items, userId, purchaseOrderId } = body as {
          items: ParsedItemPayload[];
          userId: string;
          purchaseOrderId: string;
        };

        await applyInventoryAdjustments(supabase, items ?? [], userId ?? "system", purchaseOrderId);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
  } catch (error) {
    log.error("Quick PO intake API error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json({ 
      error: "Error procesando la petición",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
