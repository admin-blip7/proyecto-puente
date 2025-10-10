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
  const supabase = getSupabaseServerClient();
  const saleId = `SALE-${uuidv4().split("-")[0].toUpperCase()}`;

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

  const productRows = await Promise.all(
    cartItems.map(async (item) => {
      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select("firestore_id, stock, cost, ownershipType, consignorId, name")
        .eq("firestore_id", item.id)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error(`Producto ${item.name} no encontrado.`);
      }
      return data;
    })
  );

  for (let index = 0; index < productRows.length; index++) {
    const row = productRows[index];
    const cartItem = cartItems[index];
    const currentStock = Number(row.stock ?? 0);
    const newStock = currentStock - cartItem.quantity;
    if (newStock < 0) {
      throw new Error(`Stock insuficiente para ${cartItem.name}.`);
    }

    const { error: updateError } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ stock: newStock })
      .eq("firestore_id", row.firestore_id ?? cartItem.id);

    if (updateError) {
      log.error("Error updating product stock", updateError);
      throw new Error(`No se pudo actualizar el stock de ${cartItem.name}.`);
    }

    const { error: logError } = await supabase.from(INVENTORY_LOGS_TABLE).insert({
      productId: row.firestore_id ?? cartItem.id,
      productName: row.name ?? cartItem.name,
      change: -cartItem.quantity,
      reason: "Venta",
      updatedBy: saleData.cashierId,
      createdAt: nowIso(),
      metadata: { saleId, cost: row.cost },
    });

    if (logError) {
      log.error("Error recording inventory log", logError);
      throw new Error("No se pudo registrar el movimiento de inventario.");
    }

    if (row.ownershipType === "Consigna" && row.consignorId) {
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
          log.warn("Unable to update consignor balance", balanceError);
        }
      }
    }
  }

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
  };

  const { data: insertedSale, error: saleError } = await supabase
    .from(SALES_TABLE)
    .insert(salePayload)
    .select("*")
    .single();

  if (saleError) {
    log.error("Error inserting sale", saleError);
    throw new Error("No se pudo registrar la venta.");
  }

  if (activeSession) {
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
        log.warn("Failed to update cash session totals", sessionUpdateError);
      }
    } catch (sessionUpdateIssue) {
      log.warn("Unexpected error updating cash session", sessionUpdateIssue);
    }
  }

  return mapSale(insertedSale);
};
