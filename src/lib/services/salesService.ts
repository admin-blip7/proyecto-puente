import { Sale, CartItem } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("salesService");

const SALES_TABLE = "sales";
const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";

const mapSale = (row: any): Sale => ({
  id: row?.firestore_id ?? row?.id ?? "",
  saleId: row?.saleId ?? "",
  items: Array.isArray(row?.items) ? row.items : [],
  totalAmount: Number(row?.totalAmount ?? 0),
  paymentMethod: row?.paymentMethod ?? "Efectivo",
  cashierId: row?.cashierId ?? "",
  cashierName: row?.cashierName ?? "",
  customerName: row?.customerName ?? null,
  customerPhone: row?.customerPhone ?? null,
  createdAt: toDate(row?.created_at ?? row?.createdAt), // Usar created_at primero
});

export const getSales = async (): Promise<Sale[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(SALES_TABLE)
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) {
      log.error("Database error fetching sales", error);
      throw error;
    }

    const sales = (data || []).map(mapSale);
    
    // Debug: Log para verificar si la venta SALE-731410C0 está en los resultados
    const targetSale = sales.find(s => s.saleId === 'SALE-731410C0');
    if (targetSale) {
      log.info('Found SALE-731410C0 in getSales:', {
        saleId: targetSale.saleId,
        createdAt: targetSale.createdAt,
        totalAmount: targetSale.totalAmount
      });
    } else {
      log.warn('SALE-731410C0 not found in getSales results');
      log.info('Available saleIds (first 10):', sales.slice(0, 10).map(s => s.saleId));
    }
    
    return sales;
  } catch (error) {
    log.error("Error in getSales", error);
    throw error;
  }
};

export const addSaleAndUpdateStock = async (
  saleData: Omit<Sale, "id" | "saleId" | "createdAt">,
  cartItems: CartItem[]
): Promise<Sale> => {
  try {
    const supabase = getSupabaseServerClient();

    const saleId = `SALE-${uuidv4().substring(0, 8).toUpperCase()}`;
    const now = nowIso();

    log.info(`Processing sale: ${saleId}`);
    log.info(`Original sale items:`, saleData.items.map(item => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      priceAtSale: item.priceAtSale
    })));

    // Obtener información de consignador para cada item
    const itemsWithConsignorId = await Promise.all(
      saleData.items.map(async (item) => {
        log.info(`Processing item:`, {
          productId: item.productId,
          name: item.name,
          quantity: item.quantity
        });

        // Buscar el producto para obtener el consignorId
        const { data: product, error: productError } = await supabase
          .from(PRODUCTS_TABLE)
          .select('consignor_id, name')
          .eq('firestore_id', item.productId)
          .single();

        if (productError) {
          log.error(`Error fetching product ${item.productId}:`, productError);
        } else {
          log.info(`Found product:`, {
            id: item.productId,
            name: product.name,
            consignorId: product.consignor_id
          });
        }

        return {
          ...item,
          consignorId: product?.consignor_id || null,
          // Always use the product name from the database to ensure consistency
          name: product?.name || item.name || 'Producto sin nombre'
        };
      })
    );

    log.info(`Items with consignorId:`, itemsWithConsignorId.map(item => ({
      productId: item.productId,
      name: item.name,
      consignorId: item.consignorId
    })));

    const sale: Sale = {
      id: uuidv4(),
      saleId,
      ...saleData,
      createdAt: new Date(now),
      items: itemsWithConsignorId, // Usar items con consignorId
    };

    // Preparar datos de la venta
    const saleRecord = {
      id: sale.id,
      firestore_id: sale.id,
      saleId: sale.saleId,
      items: sale.items, // Items ahora incluyen consignorId y nombre correcto
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      cashierId: sale.cashierId,
      cashierName: sale.cashierName,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      createdAt: sale.createdAt,
    };

    log.info(`Sale record to insert:`, {
      saleId: saleRecord.saleId,
      itemCount: saleRecord.items.length,
      items: saleRecord.items.map(item => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        consignorId: item.consignorId
      }))
    });

    // Insertar la venta
    const { error: saleError } = await supabase
      .from(SALES_TABLE)
      .insert([saleRecord]);

    if (saleError) {
      log.error("Error inserting sale", saleError);
      throw new Error(`Error al guardar la venta: ${saleError.message}`);
    }

    log.info(`Sale ${saleId} inserted successfully`);

    // Actualizar balance de consignadores si hay productos de consignación
    for (const item of sale.items) {
      if (item.consignorId) {
        try {
          // Obtener el costo del producto
          const { data: product, error: productError } = await supabase
            .from(PRODUCTS_TABLE)
            .select('cost')
            .eq('firestore_id', item.productId)
            .single();

          if (productError || !product) {
            log.warn(`Could not get cost for product ${item.productId}`);
            continue;
          }

          const consignorCost = parseFloat(product.cost || 0) * item.quantity;

          log.info(`Updating consignor ${item.consignorId} balance by +${consignorCost}`);

          // Obtener el balance actual del consignador
          const { data: currentBalance, error: balanceError } = await supabase
            .from('consignors')
            .select('balanceDue')
            .eq('id', item.consignorId)
            .single();

          if (balanceError) {
            log.warn(`Could not get current balance for consignor ${item.consignorId}`);
            continue;
          }

          const newBalance = (parseFloat(currentBalance?.balanceDue || 0) || 0) + consignorCost;

          await supabase
            .from('consignors')
            .update({
              balanceDue: newBalance,
              updated_at: now
            })
            .eq('id', item.consignorId);

          log.info(`Consignor ${item.consignorId} balance updated: ${newBalance}`);

        } catch (error) {
          log.error(`Error updating consignor balance for ${item.consignorId}:`, error);
        }
      }
    }

    // Actualizar inventario para cada item
    for (const item of cartItems) {
      try {
        log.info(`Updating stock for product: ${item.name} (ID: ${item.id})`);
        
        // Obtener el producto actual usando firestore_id
        const { data: product, error: productError } = await supabase
          .from(PRODUCTS_TABLE)
          .select('stock, name')
          .eq('firestore_id', item.id)
          .single();

        if (productError) {
          log.error(`Error fetching product ${item.id}`, productError);
          continue; // Continuar con el siguiente item
        }

        if (!product) {
          log.warn(`Product ${item.id} not found`);
          continue;
        }

        const currentStock = parseInt(product.stock) || 0;
        const newStock = Math.max(0, currentStock - item.quantity);

        log.info(`Stock update for ${product.name}: ${currentStock} -> ${newStock} (quantity sold: ${item.quantity})`);

        // Actualizar el stock usando firestore_id
        const { error: updateError } = await supabase
          .from(PRODUCTS_TABLE)
          .update({ 
            stock: newStock,
            updated_at: now
          })
          .eq('firestore_id', item.id);

        if (updateError) {
          log.error(`Error updating stock for product ${item.id}`, updateError);
        } else {
          log.info(`Updated stock for ${item.name}: ${currentStock} -> ${newStock}`);
        }

        // Registrar en inventory_logs si la tabla existe
        try {
          const { error: logError } = await supabase
            .from(INVENTORY_LOGS_TABLE)
            .insert([{
              product_id: item.id,
              change_type: 'sale',
              quantity_change: -item.quantity,
              previous_stock: currentStock,
              new_stock: newStock,
              reference_id: saleId,
              notes: `Venta: ${item.name} x${item.quantity}`,
              created_at: now
            }]);

          if (logError) {
            log.warn(`Could not log inventory change for ${item.id}`, logError);
          }
        } catch (logError) {
          log.warn("Inventory logging not available", logError);
        }

      } catch (itemError) {
        log.error(`Error processing item ${item.id}`, itemError);
      }
    }

    log.info(`Sale ${saleId} processed successfully`);
    return sale;

  } catch (error) {
    log.error("Error in addSaleAndUpdateStock", error);
    throw error;
  }
};
