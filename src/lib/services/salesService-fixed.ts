import { Sale, CartItem } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("salesService");

const SALES_TABLE = "sales";
const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";
const CASH_SESSIONS_TABLE = "cash_sessions";
const CONSIGNORS_TABLE = "consignors";
const DEDUPLICATION_TABLE = "sale_deduplication";

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
    
    log.info(`Fetched ${data?.length || 0} sales from database`);
    return (data ?? []).map(mapSale);
  } catch (error) {
    log.error("Error fetching sales", error);
    return [];
  }
};

// Función de deduplicación para prevenir ejecuciones múltiples
const checkAndMarkSaleProcessing = async (saleId: string): Promise<boolean> => {
  const supabase = getSupabaseServerClient();
  
  try {
    // Verificar si la venta ya está siendo procesada
    const { data: existingRecord, error: checkError } = await supabase
      .from(DEDUPLICATION_TABLE)
      .select("*")
      .eq("saleId", saleId)
      .maybeSingle();

    if (checkError) {
      log.error("Error checking sale deduplication", checkError);
      return false;
    }

    if (existingRecord) {
      log.warn(`Sale ${saleId} already processed or being processed`);
      return false;
    }

    // Marcar la venta como en procesamiento
    const { error: insertError } = await supabase
      .from(DEDUPLICATION_TABLE)
      .insert({
        saleId,
        status: "processing",
        createdAt: nowIso(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutos
      });

    if (insertError) {
      log.error("Error marking sale as processing", insertError);
      return false;
    }

    return true;
  } catch (error) {
    log.error("Error in deduplication check", error);
    return false;
  }
};

// Función para marcar la venta como completada
const markSaleCompleted = async (saleId: string): Promise<void> => {
  const supabase = getSupabaseServerClient();
  
  try {
    const { error } = await supabase
      .from(DEDUPLICATION_TABLE)
      .update({ 
        status: "completed",
        completedAt: nowIso()
      })
      .eq("saleId", saleId);

    if (error) {
      log.error("Error marking sale as completed", error);
    }
  } catch (error) {
    log.error("Error marking sale completion", error);
  }
};

// Función para limpiar registros expirados
const cleanupExpiredRecords = async (): Promise<void> => {
  const supabase = getSupabaseServerClient();
  
  try {
    const { error } = await supabase
      .from(DEDUPLICATION_TABLE)
      .delete()
      .lt("expiresAt", nowIso());

    if (error) {
      log.error("Error cleaning up expired records", error);
    }
  } catch (error) {
    log.error("Error in cleanup", error);
  }
};

export const addSaleAndUpdateStock = async (
  saleData: Omit<Sale, "id" | "saleId" | "createdAt">,
  cartItems: CartItem[]
): Promise<Sale> => {
  const saleId = `SALE-${uuidv4().split("-")[0].toUpperCase()}`;
  const operationId = `OP-${uuidv4().split("-")[0].toUpperCase()}`;
  
  log.info(`🚀 INICIANDO OPERACIÓN DE VENTA: ${operationId} | SaleID: ${saleId}`);
  
  // Limpieza de registros expirados
  await cleanupExpiredRecords();
  
  // Verificación de deduplicación
  const canProceed = await checkAndMarkSaleProcessing(saleId);
  if (!canProceed) {
    throw new Error(`Venta ${saleId} ya está siendo procesada o fue completada`);
  }
  
  try {
    const supabase = getSupabaseServerClient();
    
    log.info(`🔍 BUSCANDO SESIÓN DE CAJA ACTIVA para usuario: ${saleData.cashierId}`);
    const { data: activeSession, error: sessionError } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("firestore_id, startingFloat, totalCashSales, totalCardSales, totalCashPayouts")
      .eq("status", "Abierto")
      .eq("openedBy", saleData.cashierId)
      .order("openedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      log.error("Error fetching active session", sessionError);
      throw new Error("Failed to locate active session");
    }

    log.info(`✅ Sesión encontrada: ${activeSession?.firestore_id || 'No active session'}`);

    log.info(`🔍 OBTENIENDO INFORMACIÓN DE PRODUCTOS...`);
    const productRows = await Promise.all(
      cartItems.map(async (item, index) => {
        log.info(`📋 Buscando producto ${index + 1}/${cartItems.length}: ${item.name} (ID: ${item.id})`);
        
        const { data, error } = await supabase
          .from(PRODUCTS_TABLE)
          .select("id, firestore_id, stock, cost, ownershipType, consignorId, name")
          .or(`id.eq.${item.id},firestore_id.eq.${item.id}`)
          .maybeSingle();

        if (error) {
          log.error(`❌ Error fetching product ${item.id}`, error);
          throw error;
        }
        if (!data) {
          log.error(`❌ Producto ${item.name} no encontrado`);
          throw new Error(`Producto ${item.name} no encontrado.`);
        }
        
        log.info(`✅ Producto encontrado: ${data.name} | Stock actual: ${data.stock}`);
        return data;
      })
    );

    log.info(`🔄 INICIANDO ACTUALIZACIÓN DE INVENTARIO...`);
    
    // Usar transacción para garantizar atomicidad
    const { data: transactionResult, error: transactionError } = await supabase.rpc('execute_sale_transaction', {
      p_sale_id: saleId,
      p_operation_id: operationId,
      p_cart_items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        cost: item.cost,
        name: item.name
      })),
      p_cashier_id: saleData.cashierId,
      p_session_id: activeSession?.firestore_id
    });

    if (transactionError) {
      log.error("❌ Error en transacción de venta", transactionError);
      throw new Error(`Error en transacción: ${transactionError.message}`);
    }

    log.info(`✅ Transacción completada exitosamente`);

    log.info(`🧾 CREANDO REGISTRO DE VENTA...`);
    const salePayload = {
      firestore_id: uuidv4(),
      saleId,
      items: saleData.items,
      totalAmount: saleData.totalAmount,
      paymentMethod: saleData.paymentMethod,
      cashierId: saleData.cashierId,
      cashierName: saleData.cashierName,
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      createdAt: nowIso(),
      sessionId: activeSession?.firestore_id ?? null,
      metadata: {
        operationId,
        transactionId: transactionResult?.transaction_id,
        debugInfo: {
          productCount: cartItems.length,
          totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
          timestamp: new Date().toISOString()
        }
      }
    };

    const { data: insertedSale, error: saleError } = await supabase
      .from(SALES_TABLE)
      .insert(salePayload)
      .select("*")
      .single();

    if (saleError) {
      log.error("❌ Error inserting sale", saleError);
      throw new Error("No se pudo registrar la venta.");
    }

    log.info(`✅ Venta registrada correctamente: ${saleId}`);

    if (activeSession) {
      log.info(`💰 ACTUALIZANDO SESIÓN DE CAJA...`);
      try {
        const incrementField = saleData.paymentMethod === "Efectivo" ? "totalCashSales" : "totalCardSales";
        const currentCash = Number(activeSession.totalCashSales ?? 0);
        const currentCard = Number(activeSession.totalCardSales ?? 0);
        const newCash = incrementField === "totalCashSales" ? currentCash + saleData.totalAmount : currentCash;
        const newCard = incrementField === "totalCardSales" ? currentCard + saleData.totalAmount : currentCard;
        const expectedCashInDrawer =
          Number(activeSession.startingFloat ?? 0) + newCash - Number(activeSession.totalCashPayouts ?? 0);

        const { error: sessionUpdateError } = await supabase
          .from(CASH_SESSIONS_TABLE)
          .update({
            totalCashSales: newCash,
            totalCardSales: newCard,
            expectedCashInDrawer,
          })
          .eq("firestore_id", activeSession.firestore_id);

        if (sessionUpdateError) {
          log.warn("⚠️ Failed to update cash session totals", sessionUpdateError);
        } else {
          log.info(`✅ Sesión de caja actualizada: ${incrementField} += ${saleData.totalAmount}`);
        }
      } catch (sessionUpdateIssue) {
        log.warn("⚠️ Unexpected error updating cash session", sessionUpdateIssue);
      }
    }

    // Marcar la venta como completada
    await markSaleCompleted(saleId);

    log.info(`🎉 OPERACIÓN COMPLETADA EXITOSAMENTE: ${operationId}`);
    return mapSale(insertedSale);

  } catch (error) {
    log.error(`❌ Error en operación ${operationId}:`, error);
    
    // En caso de error, limpiar el registro de deduplicación
    try {
      const supabase = getSupabaseServerClient();
      await supabase
        .from(DEDUPLICATION_TABLE)
        .delete()
        .eq("saleId", saleId);
    } catch (cleanupError) {
      log.error("Error cleaning up deduplication record", cleanupError);
    }
    
    throw error;
  }
};