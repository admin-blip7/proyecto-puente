"use server";

import { Sale, CartItem } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";
import { registerSaleInCRM } from "@/lib/utils/crmUtils";
import { depositSaleToAccount } from "./financeService";

const log = getLogger("salesService");

const SALES_TABLE = "sales";
const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";

const mapSale = (row: any): Sale => ({
  id: row?.id ?? "",
  saleId: row?.saleId ?? "",
  items: Array.isArray(row?.items) ? row.items : [],
  totalAmount: Number(row?.totalAmount ?? 0),
  paymentMethod: row?.paymentMethod ?? "Efectivo",
  cashierId: row?.cashierId ?? "",
  cashierName: row?.cashierName ?? "",
  customerName: row?.customerName ?? null,
  customerPhone: row?.customerPhone ?? null,
  createdAt: toDate(row?.created_at ?? row?.createdAt), // Usar created_at primero
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
});

export const getSales = async (
  includeStatus: 'all' | 'completed' | 'cancelled' = 'completed',
  page: number = 0,
  limit: number = 50,
  searchQuery: string = "",
  startDate: string = "", // YYYY-MM-DD
  endDate: string = ""    // YYYY-MM-DD
): Promise<{ sales: Sale[], total: number }> => {
  try {
    const supabase = getSupabaseServerClient();

    // We need to fetch all sales and filter dates in JavaScript, similar to financeService.ts.

    // Fetch all sales with status filter only (we'll filter by date and search in JavaScript)
    let query = supabase
      .from(SALES_TABLE)
      .select("*", { count: 'exact' });

    // Status Filter
    if (includeStatus === 'cancelled') {
      query = query.eq('status', 'cancelled');
    } else if (includeStatus !== 'all') {
      query = query.or('status.is.null,status.eq.completed');
    }

    // Fetch all data (we'll sort and paginate after filtering)
    // Note: Order by createdAt handled in memory due to complex date filtering requirements
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

        // Use robust toDate utility
        const saleDate = toDate(sale.createdAt);

        // Get the date portion in Mexico timezone (YYYY-MM-DD)
        const saleDateStr = saleDate.toLocaleDateString('en-CA', {
          timeZone: 'America/Mexico_City'
        });

        // Apply date filters using string comparison for dates
        if (startDate && saleDateStr < startDate) return false;
        if (endDate && saleDateStr > endDate) return false;

        return true;
      });
    }

    // Search Filter (JavaScript-side)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      sales = sales.filter(sale =>
        sale.saleId.toLowerCase().includes(lowerQuery) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply pagination after filtering
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

    // 1. Fetch by sessionId (Primary source)
    const { data: sessionSales, error: sessionError } = await supabase
      .from(SALES_TABLE)
      .select("*")
      .eq("sessionId", sessionId)
      .order("createdAt", { ascending: false });

    if (sessionError) {
      log.error("Error fetching sales by session ID", sessionError);
      // We don't return empty yet, we try to get orphans if possible, 
      // although if this failed, likely DB is down.
    } else {
      allSales = sessionSales || [];
    }

    // 2. Fetch Orphan Sales (Secondary source)
    // Include sales that have NO sessionId but fall within the time range for this cashier
    if (cashierId && startDate && endDate) {
      try {
        log.info(`Checking for orphan sales for session ${sessionId} (Cashier: ${cashierId})`);

        // Fetch sales by cashier that have no session ID
        const { data: orphanCandidates, error: orphanError } = await supabase
          .from(SALES_TABLE)
          .select("*")
          .eq("cashierId", cashierId)
          .is("sessionId", null) // Only get sales that are truly orphans
          .order("createdAt", { ascending: false });

        if (orphanError) {
          log.warn("Error fetching orphan candidates:", orphanError);
        } else if (orphanCandidates && orphanCandidates.length > 0) {
          // Filter by date range in memory to be safe against timezone/format issues
          const startMm = startDate.getTime();
          const endMm = endDate.getTime();

          const validOrphans = orphanCandidates.filter(row => {
            const rowDate = toDate(row.createdAt || row.created_at);
            const rowTime = rowDate.getTime();
            return rowTime >= startMm && rowTime <= endMm;
          });

          if (validOrphans.length > 0) {
            log.info(`Found ${validOrphans.length} orphan sales to include in session ${sessionId}`);
            // Merge orphans
            allSales = [...allSales, ...validOrphans];
          }
        }
      } catch (orphanErr) {
        log.error("Error processing orphan sales", orphanErr);
      }
    }

    if (allSales.length === 0 && sessionError) {
      // If we failed to get session sales and found no orphans, returm empty
      return [];
    }

    // Sort combined results by date descending
    allSales.sort((a, b) => {
      const dateA = toDate(a.createdAt || a.created_at).getTime();
      const dateB = toDate(b.createdAt || b.created_at).getTime();
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
          .eq('id', item.productId)
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

    // Link to Active Session if not provided
    // This prevents "Orphaned Sales" (ventas huérfanas) which don't appear in cash cuts
    let finalSessionId = saleData.sessionId;
    if (!finalSessionId && saleData.cashierId) {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from("cash_sessions") // Hardcoded table check to avoid circular dep issues if constants not exported
          .select("sessionId")
          .eq("status", "Abierto")
          .eq("openedBy", saleData.cashierId)
          .order("openedAt", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionData) {
          finalSessionId = sessionData.sessionId;
          log.info(`Auto-linked sale ${saleId} to active session ${finalSessionId}`);
        }
      } catch (sessionLookupError) {
        log.warn("Error looking up active session for sale", sessionLookupError);
      }
    }

    const sale: Sale = {
      id: uuidv4(),
      saleId,
      ...saleData,
      sessionId: finalSessionId, // Ensure session ID is attached
      createdAt: new Date(now),
      items: itemsWithConsignorId, // Usar items con consignorId
    };

    // Preparar datos de la venta
    const saleRecord = {
      id: sale.id,
      // firestore_id removed
      saleId: sale.saleId,
      items: sale.items, // Items ahora incluyen consignorId y nombre correcto
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      cashierId: sale.cashierId,
      cashierName: sale.cashierName,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      createdAt: sale.createdAt,
      status: 'completed',
      amount_paid: sale.amountPaid,
      change_given: sale.changeGiven,
      sessionId: sale.sessionId, // Explicitly include the determined session ID
      // Discount fields
      discount_code: (saleData as any).discountCode || null,
      discount_amount: (saleData as any).discountAmount || null,
      discount_percentage: (saleData as any).discountPercentage || null,
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

    // Deposit cash sales to 'Caja Chica'
    // DISABLED: User requested consolidated deposits only at session close (Corte de Caja).
    // if (sale.paymentMethod === 'Efectivo') {
    //   await depositSaleToAccount(
    //     sale.totalAmount, 
    //     sale.paymentMethod, 
    //     saleId,
    //     sale.sessionId,
    //     sale.cashierId
    //   );
    // }

    // Actualizar balance de consignadores si hay productos de consignación
    for (const item of sale.items) {
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
          return sale;
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
                  related_id: sale.id,
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

    return sale;

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
