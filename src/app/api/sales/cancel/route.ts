import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";
import { nowIso } from "@/lib/supabase/utils";

const log = getLogger("cancelSalesAPI");

interface CancelSalesRequest {
  saleIds: string[];
  userId: string;
  userName: string;
}

interface CancelResult {
  saleId: string;
  success: boolean;
  error?: string;
}

export async function POST(request: Request) {
  try {
    log.info("Cancel sales API endpoint called");

    const body: CancelSalesRequest = await request.json();
    const { saleIds, userId, userName } = body;

    // Validate input
    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Se requiere al menos un ID de venta",
      }, { status: 400 });
    }

    if (!userId || !userName) {
      return NextResponse.json({
        success: false,
        error: "Se requiere información del usuario",
      }, { status: 400 });
    }

    log.info(`Processing cancellation for ${saleIds.length} sales by user ${userName}`);

    const supabase = getSupabaseServerClient();
    const now = nowIso();
    const results: CancelResult[] = [];

    // Process each sale
    for (const saleId of saleIds) {
      try {
        log.info(`Processing cancellation for sale: ${saleId}`);

        // Fetch the sale
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .select('*')
          .eq('saleId', saleId)
          .single();

        if (saleError || !sale) {
          log.error(`Sale ${saleId} not found:`, saleError);
          results.push({
            saleId,
            success: false,
            error: 'Venta no encontrada'
          });
          continue;
        }

        // Restore inventory for each item
        const items = sale.items || [];
        for (const item of items) {
          try {
            // Get current product stock
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('id, stock, name')
              .eq('id', item.productId)
              .single();

            if (productError || !product) {
              log.warn(`Product ${item.productId} not found, skipping stock restoration`);
              continue;
            }

            const currentStock = parseInt(product.stock) || 0;
            const newStock = currentStock + item.quantity;

            log.info(`Restoring stock for ${product.name}: ${currentStock} -> ${newStock}`);

            // Update stock
            const { error: updateError } = await supabase
              .from('products')
              .update({
                stock: newStock,
                updated_at: now
              })
              .eq('id', product.id);

            if (updateError) {
              log.error(`Error updating stock for product ${item.productId}:`, updateError);
            }

            // Log inventory change
            try {
              await supabase
                .from('inventory_logs')
                .insert([{
                  product_id: item.productId,
                  change_type: 'sale_cancellation',
                  quantity_change: item.quantity,
                  previous_stock: currentStock,
                  new_stock: newStock,
                  reference_id: saleId,
                  notes: `Cancelación de venta: ${item.name} x${item.quantity} por ${userName}`,
                  created_at: now
                }]);
            } catch (logError) {
              log.warn(`Could not log inventory change for ${item.productId}`, logError);
            }

            // Revert consignor balance if applicable
            if (item.consignorId) {
              try {
                const { data: productWithCost } = await supabase
                  .from('products')
                  .select('cost')
                  .eq('id', item.productId)
                  .single();

                if (productWithCost) {
                  const consignorCost = parseFloat(productWithCost.cost || 0) * item.quantity;

                  const { data: currentBalance } = await supabase
                    .from('consignors')
                    .select('balanceDue')
                    .eq('id', item.consignorId)
                    .single();

                  if (currentBalance) {
                    const newBalance = (parseFloat(currentBalance.balanceDue || 0) || 0) - consignorCost;

                    await supabase
                      .from('consignors')
                      .update({
                        balanceDue: newBalance,
                        updated_at: now
                      })
                      .eq('id', item.consignorId);

                    log.info(`Consignor ${item.consignorId} balance reverted by -${consignorCost}`);
                  }
                }
              } catch (error) {
                log.warn(`Could not revert consignor balance for ${item.consignorId}:`, error);
              }
            }
          } catch (itemError) {
            log.error(`Error processing item ${item.productId}:`, itemError);
          }
        }

        // Mark the sale as cancelled
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            status: 'cancelled',
            cancelled_at: now,
            cancelled_by: userId,
            cancel_reason: 'Cancelled by user',
            updated_at: now,
          })
          .eq('saleId', saleId);

        if (updateError) {
          log.error(`Error updating sale ${saleId}:`, updateError);
          results.push({
            saleId,
            success: false,
            error: 'Error al actualizar la venta',
          });
          continue;
        }

        log.info(`Sale ${saleId} cancelled successfully`);
        results.push({
          saleId,
          success: true
        });

      } catch (error: any) {
        log.error(`Error processing sale ${saleId}:`, error);
        results.push({
          saleId,
          success: false,
          error: error.message || 'Error desconocido'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    log.info(`Cancellation complete: ${successCount} successful, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: `${successCount} ventas canceladas exitosamente`,
      results,
      summary: {
        total: saleIds.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error: any) {
    log.error("Error in cancel sales API:", error);

    return NextResponse.json({
      success: false,
      error: "Error al cancelar las ventas",
      details: error.message || "Error interno del servidor"
    }, { status: 500 });
  }
}
