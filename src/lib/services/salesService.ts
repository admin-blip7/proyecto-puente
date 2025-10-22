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
  createdAt: toDate(row?.createdAt),
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

    return (data || []).map(mapSale);
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

    const sale: Sale = {
      id: uuidv4(),
      saleId,
      ...saleData,
      createdAt: new Date(now),
    };

    // Preparar datos de la venta
    const saleRecord = {
      id: sale.id,
      firestore_id: sale.id,
      saleId: sale.saleId,
      items: sale.items,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      cashierId: sale.cashierId,
      cashierName: sale.cashierName,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      createdAt: sale.createdAt,
    };

    // Insertar la venta
    const { error: saleError } = await supabase
      .from(SALES_TABLE)
      .insert([saleRecord]);

    if (saleError) {
      log.error("Error inserting sale", saleError);
      throw new Error(`Error al guardar la venta: ${saleError.message}`);
    }

    log.info(`Sale ${saleId} inserted successfully`);

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
