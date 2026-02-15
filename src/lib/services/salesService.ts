"use server";

import { Sale, CartItem } from "@/types";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";
import { registerSaleInCRM } from "@/lib/utils/crmUtils";
import { depositSaleToAccount } from "./financeService";
import { registerKardexMovement } from "@/lib/services/kardexService";

const log = getLogger("salesService");

const SALES_TABLE = "sales";
const SALE_ITEMS_TABLE = "sale_items";
const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";

const mapSale = (row: any): Sale => ({
  id: row?.id ?? "",
  saleId: row?.sale_number ?? row?.saleId ?? "", // Usar sale_number como saleId
  items: Array.isArray(row?.sale_items)
    ? row.sale_items.map((it: any) => ({
      productId: it.product_id,
      name: it.product_name,
      quantity: it.quantity,
      priceAtSale: Number(it.price_at_sale),
      costAtSale: Number(it.cost_at_sale ?? 0),
      consignorId: it.consignor_id
    }))
    : [],
  totalAmount: Number(row?.total_amount ?? 0),
  paymentMethod: row?.payment_method ?? "Efectivo",
  cashierId: row?.cashier_id ?? "",
  cashierName: row?.cashier_name ?? "",
  customerName: row?.customer_name ?? null,
  customerPhone: row?.customer_phone ?? null,
  createdAt: row?.created_at ? toDate(row.created_at) : new Date(),
  status: row?.status ?? "completed",
  cancelledAt: row?.cancelled_at ? toDate(row.cancelled_at) : undefined,
  cancelledBy: row?.cancelled_by ?? undefined,
  cancelReason: row?.cancel_reason ?? undefined,
  amountPaid: row?.amount_paid ? Number(row.amount_paid) : undefined,
  changeGiven: row?.change_given ? Number(row.change_given) : undefined,
  // Discount fields
  discountCode: row?.discount_code ?? undefined,
  discountAmount: row?.discount_amount ? Number(row.discount_amount) : undefined,
  discountPercentage: row?.discount_percentage ? Number(row.discount_percentage) : undefined,
  sessionId: row?.session_id ?? undefined,
  userId: row?.user_id ?? undefined,
  shippingInfo: row?.shipping_info ?? undefined,
  deliveryStatus: row?.delivery_status ?? undefined,
  trackingNumber: row?.tracking_number ?? undefined,
});

export const getSales = async (
  includeStatus: 'all' | 'completed' | 'cancelled' = 'completed',
  page: number = 0,
  limit: number = 50,
  searchQuery: string = "",
  startDate: string = "", // YYYY-MM-DD
  endDate: string = "",   // YYYY-MM-DD
  userId?: string
): Promise<{ sales: Sale[], total: number }> => {
  try {
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from(SALES_TABLE)
      .select("*, sale_items(*)", { count: 'exact' });

    // Status Filter
    if (includeStatus === 'cancelled') {
      query = query.eq('status', 'cancelled');
    } else if (includeStatus !== 'all') {
      query = query.or('status.is.null,status.eq.completed');
    }

    // User Filter
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: allData, error, count } = await query;

    if (error) {
      log.error("Error fetching sales with filters:", error);
      throw error;
    }

    // Map to Sale objects
    let sales = (allData || []).map(mapSale);

    // Date Range Filter (JavaScript-side)
    if (startDate || endDate) {
      sales = sales.filter(sale => {
        if (!sale.createdAt) return false;

        const saleDate = toDate(sale.createdAt);
        const saleDateStr = saleDate.toLocaleDateString('en-CA', {
          timeZone: 'America/Mexico_City'
        });

        if (startDate && saleDateStr < startDate) return false;
        if (endDate && saleDateStr > endDate) return false;

        return true;
      });
    }

    // Search Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      sales = sales.filter(sale =>
        sale.saleId.toLowerCase().includes(lowerQuery) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(lowerQuery))
      );
    }

    const total = sales.length;
    const from = page * limit;
    const to = from + limit;
    const paginatedSales = sales.slice(from, to);

    return {
      sales: paginatedSales,
      total
    };

  } catch (error) {
    log.error("Error in getSales", error);
    throw error;
  }
};


export const getSalesBySession = async (
  sessionId: string,
  cashierId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<Sale[]> => {
  try {
    const supabase = getSupabaseServerClient();
    let allSales: any[] = [];

    let targetSessionId = sessionId;

    // 1. Resolve sessionId to UUID if it's a human-readable ID (CS-XXXX)
    if (!uuidValidate(sessionId)) {
      const { data: sessionData, error: lookupError } = await supabase
        .from("cash_sessions")
        .select("id")
        .eq("session_number", sessionId)
        .maybeSingle();

      if (sessionData?.id) {
        targetSessionId = sessionData.id;
      } else if (lookupError) {
        log.error("Error resolving session ID:", lookupError);
      }
    }

    // 2. Fetch by session_id (Primary source)
    const { data: sessionSales, error: sessionError } = await supabase
      .from(SALES_TABLE)
      .select("*, sale_items(*)")
      .eq("session_id", targetSessionId)
      .order("created_at", { ascending: false });

    if (sessionError) {
      log.error("Error fetching sales by session ID", sessionError);
    } else {
      allSales = sessionSales || [];
    }

    // Sort combined results by date descending
    allSales.sort((a, b) => {
      const dateA = toDate(a.created_at).getTime();
      const dateB = toDate(b.created_at).getTime();
      return dateB - dateA;
    });

    return allSales.map(mapSale);
  } catch (error) {
    log.error("Error in getSalesBySession", error);
    return [];
  }
};

export const addSaleAndUpdateStock = async (
  saleData: Omit<Sale, "id" | "saleId" | "createdAt">,
  cartItems: CartItem[],
  crmClientId?: string | null,
  skipCrmInteraction?: boolean
): Promise<Sale> => {
  try {
    const supabase = getSupabaseServerClient();

    const saleId = `SALE-${uuidv4().substring(0, 8).toUpperCase()}`;
    const now = nowIso();

    log.info(`Processing sale: ${saleId}`);

    // Obtener información de consignador para cada item
    const itemsWithConsignorId = await Promise.all(
      saleData.items.map(async (item) => {
        const { data: product, error: productError } = await supabase
          .from(PRODUCTS_TABLE)
          .select('consignor_id, name, cost')
          .eq('id', item.productId)
          .single();

        return {
          ...item,
          consignorId: product?.consignor_id || null,
          costAtSale: Number(product?.cost || 0),
          name: product?.name || item.name || 'Producto sin nombre'
        };
      })
    );

    // Link to Active Session
    let finalSessionId = saleData.sessionId;
    if (!finalSessionId && saleData.cashierId) {
      try {
        const { data: sessionData } = await supabase
          .from("cash_sessions")
          .select("id")
          .eq("status", "Abierto")
          .eq("opened_by", saleData.cashierId)
          .order("opened_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionData) {
          finalSessionId = sessionData.id;
        }
      } catch (sessionLookupError) {
        log.warn("Error looking up active session for sale", sessionLookupError);
      }
    }

    const saleUUID = uuidv4();

    // Preparar datos de la venta (Cabecera)
    const saleRecord = {
      id: saleUUID,
      sale_number: saleId,
      total_amount: saleData.totalAmount,
      payment_method: saleData.paymentMethod,
      cashier_id: saleData.cashierId,
      cashier_name: saleData.cashierName,
      customer_name: saleData.customerName,
      customer_phone: saleData.customerPhone,
      created_at: now,
      status: 'completed',
      amount_paid: saleData.amountPaid,
      change_given: saleData.changeGiven,
      session_id: finalSessionId,
      discount_code: (saleData as any).discountCode || null,
      discount_amount: (saleData as any).discountAmount || null,
      user_id: saleData.userId || null,
      shipping_info: saleData.shippingInfo || null,
      delivery_status: saleData.deliveryStatus || 'pending',
      tracking_number: saleData.trackingNumber || null,
    };

    // Insertar la venta
    const { error: saleError } = await supabase
      .from(SALES_TABLE)
      .insert([saleRecord]);

    if (saleError) {
      log.error("Error inserting sale", saleError);
      throw new Error(`Error al guardar la venta: ${saleError.message}`);
    }

    // Insertar los items de la venta
    const saleItemsRecords = itemsWithConsignorId.map(item => ({
      sale_id: saleUUID,
      product_id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      price_at_sale: item.priceAtSale,
      cost_at_sale: item.costAtSale,
      consignor_id: item.consignorId
    }));

    const { error: itemsError } = await supabase
      .from(SALE_ITEMS_TABLE)
      .insert(saleItemsRecords);

    if (itemsError) {
      log.error("Error inserting sale items", itemsError);
    }

    const finalSale: Sale = {
      id: saleUUID,
      saleId: saleId,
      ...saleData,
      sessionId: finalSessionId,
      createdAt: new Date(now),
      items: itemsWithConsignorId,
    };

    log.info(`Sale ${saleId} inserted successfully`);

    // Actualizar balance de consignadores si hay productos de consignación
    for (const item of finalSale.items) {
      if (item.consignorId) {
        try {
          // Obtener el costo del producto
          const { data: product, error: productError } = await supabase
            .from(PRODUCTS_TABLE)
            .select('cost')
            .eq('id', item.productId)
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
            .select('balance_due')
            .eq('id', item.consignorId)
            .single();

          if (balanceError) {
            log.warn(`Could not get current balance for consignor ${item.consignorId}`);
            continue;
          }

          const newBalance = (parseFloat(currentBalance?.balance_due || 0) || 0) + consignorCost;

          await supabase
            .from('consignors')
            .update({
              balance_due: newBalance,
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
        // Si es una reparación, procesar la recolección de ganancias
        if (item.repairId) {
          log.info(`Processing repair collection for repairId: ${item.repairId}`);
          const { error: repairError } = await supabase.rpc('collect_repair_profit', {
            p_repair_id: item.repairId
          });

          if (repairError) {
            log.error(`Error collecting profit for repair ${item.repairId}`, repairError);
            // No lanzamos error para no detener la venta, pero logueamos el fallo
          } else {
            log.info(`Successfully collected profit for repair ${item.repairId}`);
          }
          continue; // Saltar actualización de stock para reparaciones
        }

        log.info(`Updating stock for product: ${item.name} (ID: ${item.id})`);

        // Obtener el producto actual
        const { data: product, error: productError } = await supabase
          .from(PRODUCTS_TABLE)
          .select('stock, name, id') // Ensure we get the ID for logging if needed
          .eq('id', item.id)
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

        // Actualizar el stock
        const { error: updateError } = await supabase
          .from(PRODUCTS_TABLE)
          .update({
            stock: newStock,
            updated_at: new Date(now),
          })
          .eq("id", item.id);

        if (updateError) {
          log.error(`Error updating stock for product ${item.id}`, updateError);
        } else {
          log.info(`Updated stock for ${item.name}: ${currentStock} -> ${newStock}`);
        }

        // Register Kardex movement for the sale (SALIDA)
        try {
          const kardexResult = await registerKardexMovement({
            productoId: item.id,
            tipo: "SALIDA",
            concepto: `Venta #${saleId}`,
            cantidad: item.quantity,
            stockAnterior: currentStock,
            precioUnitario: item.price,
            referencia: saleId,
            usuarioId: saleData.cashierId ?? null,
            notas: `Venta: ${item.name} x${item.quantity}`
          });
          
          if (kardexResult.error) {
            log.warn(`Failed to register kardex for product ${item.id}: ${kardexResult.error}`);
          }
        } catch (kardexError) {
          log.warn(`Error registering kardex for product ${item.id}:`, kardexError);
        }

        // Registrar en inventory_logs si la tabla existe
        try {
          const { error: logError } = await supabase
            .from(INVENTORY_LOGS_TABLE)
            .insert([{
              product_id: item.id,
              product_name: item.name,
              change: -item.quantity,
              reason: `Venta: ${item.name} x${item.quantity}`,
              metadata: {
                change_type: 'sale',
                previous_stock: currentStock,
                new_stock: newStock,
                reference_id: saleId,
              },
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

    // Update CRM client if one was selected during checkout (and skip if auto-created, already done)
    if (crmClientId && !skipCrmInteraction) {
      try {
        log.info(`Updating CRM client ${crmClientId} with sale info`);

        // First fetch the client by id or firestore_id to get the database ID and current purchases
        let clientQuery = supabase
          .from('crm_clients')
          .select('id, total_purchases');

        // Check if crmClientId is numeric to search by ID, otherwise search by ID (assuming it's a UUID)
        if (/^\d+$/.test(crmClientId)) {
          clientQuery = clientQuery.eq('id', parseInt(crmClientId));
        } else {
          clientQuery = clientQuery.eq('id', crmClientId);
        }

        const { data: clientData, error: fetchError } = await clientQuery.single();

        if (fetchError || !clientData) {
          log.warn(`Client not found: ${crmClientId}`, fetchError);
          return finalSale;
        }

        const dbClientId = clientData.id;

        // Update client total_purchases (sum, not replace) and last_contact_date
        const currentTotal = clientData.total_purchases || 0;
        const newTotalPurchases = currentTotal + saleData.totalAmount;
        log.info(`Updating client ${crmClientId} total_purchases: ${currentTotal} + ${saleData.totalAmount} = ${newTotalPurchases}`);

        const { data: updatedClient, error: updateError } = await supabase
          .from('crm_clients')
          .update({
            total_purchases: newTotalPurchases,
            last_contact_date: now
          })
          .eq('id', dbClientId)
          .select()
          .single();

        if (updateError) {
          log.warn(`Failed to update CRM client ${crmClientId}:`, updateError);
        } else {
          log.info(`Updated CRM client ${crmClientId}:`, {
            currentTotal: currentTotal,
            saleAmount: saleData.totalAmount,
            newTotal: updatedClient?.total_purchases,
            lastContactDate: updatedClient?.last_contact_date
          });

          // Create CRM interaction for the sale (unless it was already created during client auto-creation)
          if (!skipCrmInteraction) {
            try {
              const { data: interaction, error: interactionError } = await supabase
                .from('crm_interactions')
                .insert({
                  // firestore_id removed
                  client_id: dbClientId,
                  interaction_type: 'sale',
                  interaction_date: now,
                  amount: saleData.totalAmount,
                  description: `Sale: ${saleId}`,
                  related_id: finalSale.id,
                  related_table: 'sales',
                  status: 'completed'
                })
                .select()
                .single();

              if (interactionError) {
                log.warn(`Failed to create CRM interaction:`, interactionError);
              } else {
                log.info(`Created CRM interaction for sale ${saleId}`);
              }
            } catch (interactionError) {
              log.warn("Error creating CRM interaction", interactionError);
            }
          }
        }
      } catch (crmError) {
        // Don't let CRM errors break the sale process
        log.warn("Failed to update CRM client", crmError);
      }
    } else {
      // Register sale in CRM if customer information is available but no client selected
      try {
        await registerSaleInCRM(saleId, saleData.totalAmount, {
          name: saleData.customerName,
          phone: saleData.customerPhone
        });
      } catch (crmError) {
        // Don't let CRM errors break the sale process
        log.warn("Failed to register sale in CRM", crmError);
      }
    }

    return finalSale;

  } catch (error) {
    log.error("Error in addSaleAndUpdateStock", error);
    throw error;
  }
};

export interface CancelSalesResult {
  saleId: string;
  success: boolean;
  errorMessage?: string;
}

export interface CancelSalesResponse {
  results: CancelSalesResult[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

/**
 * Cancel one or multiple sales, restore inventory, adjust consignor balances, and log the reversal
 * @param saleIds - Array of sale IDs to cancel
 * @param performedBy - User ID who is performing the cancellation
 * @param performedByName - User name who is performing the cancellation
 * @param cancelReason - Optional reason for cancellation
 * @returns Object with per-sale results and summary statistics
 */
export const cancelSales = async (
  saleIds: string[],
  performedBy: string,
  performedByName: string,
  cancelReason?: string
): Promise<CancelSalesResponse> => {
  try {
    const supabase = getSupabaseServerClient();

    log.info(`Cancelling ${saleIds.length} sale(s)`, {
      saleIds,
      performedBy,
      performedByName,
      cancelReason
    });

    // Call the stored procedure
    const { data, error } = await supabase.rpc('cancel_sales', {
      p_sale_ids: saleIds,
      p_user_id: performedBy,
      p_user_name: performedByName,
      p_cancel_reason: cancelReason || null
    });

    if (error) {
      log.error("Error calling cancel_sales stored procedure", error);
      throw new Error(`Failed to cancel sales: ${error.message}`);
    }

    // Process the results
    const results: CancelSalesResult[] = (data || []).map((row: any) => ({
      saleId: row.sale_id,
      success: row.success,
      errorMessage: row.error_message || undefined
    }));

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    log.info(`Cancellation complete: ${successCount} succeeded, ${failureCount} failed`, {
      results
    });

    // Invalidate caches or refresh data if needed
    // For now, we rely on the calling code to refresh as needed

    return {
      results,
      totalProcessed: results.length,
      successCount,
      failureCount
    };

  } catch (error) {
    log.error("Error in cancelSales", error);
    throw error;
  }
};
