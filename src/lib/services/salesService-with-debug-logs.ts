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

export const addSaleAndUpdateStock = async (
  saleData: Omit<Sale, "id" | "saleId" | "createdAt">,
  cartItems: CartItem[]
): Promise<Sale> => {
  const saleId = `SALE-${uuidv4().split("-")[0].toUpperCase()}`;
  const operationId = `OP-${uuidv4().split("-")[0].toUpperCase()}`;
  
  log.info(`🚀 INICIANDO OPERACIÓN DE VENTA: ${operationId} | SaleID: ${saleId}`);
  log.info(`📦 Items en carrito: ${cartItems.length}`);
  
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
  
  for (let index = 0; index < productRows.length; index++) {
    const row = productRows[index];
    const cartItem = cartItems[index];
    const currentStock = Number(row.stock ?? 0);
    const newStock = currentStock - cartItem.quantity;
    
    log.info(`📦 ACTUALIZANDO PRODUCTO ${index + 1}/${productRows.length}: ${row.name}`);
    log.info(`📊 Stock actual: ${currentStock} | Cantidad vendida: ${cartItem.quantity} | Nuevo stock: ${newStock}`);
    
    if (newStock < 0) {
      log.error(`❌ Stock insuficiente para ${cartItem.name}. Actual: ${currentStock}, Solicitado: ${cartItem.quantity}`);
      throw new Error(`Stock insuficiente para ${cartItem.name}.`);
    }

    log.info(`💾 ACTUALIZANDO stock en base de datos...`);
    const { error: updateError } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ stock: newStock })
      .eq("id", row.id);

    if (updateError) {
      log.error("❌ Error updating product stock", updateError);
      throw new Error(`No se pudo actualizar el stock de ${cartItem.name}.`);
    }
    
    log.info(`✅ Stock actualizado correctamente`);

    log.info(`📝 REGISTRANDO log de inventario...`);
    const logData = {
      productId: row.firestore_id ?? row.id,
      productName: row.name ?? cartItem.name,
      change: -cartItem.quantity,
      reason: "Venta",
      updatedBy: saleData.cashierId,
      createdAt: nowIso(),
      metadata: { 
        saleId, 
        operationId,
        cost: row.cost,
        timestamp: new Date().toISOString(),
        step: `product-${index + 1}-of-${productRows.length}`
      },
    };
    
    log.info(`📊 Log data: ${JSON.stringify(logData, null, 2)}`);
    
    const { error: logError } = await supabase.from(INVENTORY_LOGS_TABLE).insert(logData);

    if (logError) {
      log.error("❌ Error recording inventory log", logError);
      throw new Error("No se pudo registrar el movimiento de inventario.");
    }
    
    log.info(`✅ Log de inventario registrado correctamente`);

    if (row.ownershipType === "Consigna" && row.consignorId) {
      log.info(`💰 ACTUALIZANDO balance de consignador...`);
      const amountDue = Number(row.cost ?? 0) * cartItem.quantity;
      const { data: consignor, error: consignorError } = await supabase
        .from(CONSIGNORS_TABLE)
        .select("firestore_id, balanceDue")
        .eq("firestore_id", row.consignorId)
        .maybeSingle();

      if (!consignorError && consignor) {
        const newBalance = Number(consignor.balanceDue ?? 0) + amountDue;
        const { error: balanceError } = await supabase
          .from(CONSIGNORS_TABLE)
          .update({ balanceDue: newBalance })
          .eq("firestore_id", consignor.firestore_id ?? row.consignorId);

        if (balanceError) {
          log.warn("⚠️ Unable to update consignor balance", balanceError);
        } else {
          log.info(`✅ Balance de consignador actualizado: ${amountDue}`);
        }
      }
    }
  }

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
      debugInfo: {
        productCount: cartItems.length,
        totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        timestamp: new Date().toISOString()
      }
    }
  };

  log.info(`📊 Sale payload: ${JSON.stringify(salePayload, null, 2)}`);

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

  log.info(`🎉 OPERACIÓN COMPLETADA EXITOSAMENTE: ${operationId}`);
  return mapSale(insertedSale);
};