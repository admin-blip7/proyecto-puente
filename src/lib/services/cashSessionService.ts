"use server";

import { v4 as uuidv4 } from "uuid";
import { CashSession } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";
import { getSalesBySession } from "./salesService";
import { addIncome } from "./incomeService";

const log = getLogger("cashSessionService");

const CASH_SESSIONS_TABLE = "cash_sessions";
const ACCOUNTS_TABLE = "accounts";

const calculateBagsEndAmounts = (
  start: Record<string, number>,
  sales: Record<string, number>
): Record<string, number> => {
  const result: Record<string, number> = { ...start };
  for (const [key, value] of Object.entries(sales)) {
    const startVal = result[key] || 0;
    result[key] = startVal - value;
  }
  return result;
};

const mapSession = (row: any): CashSession => ({
  id: row?.firestore_id ?? row?.id ?? "",
  sessionId: row?.sessionId ?? "",
  status: row?.status ?? "Abierto",
  openedBy: row?.openedBy ?? "",
  openedByName: row?.openedByName ?? "",
  openedAt: toDate(row?.openedAt),
  startingFloat: Number(row?.startingFloat ?? 0),
  closedBy: row?.closedBy ?? undefined,
  closedByName: row?.closedByName ?? undefined,
  closedAt: row?.closedAt ? toDate(row.closedAt) : undefined,
  totalCashSales: Number(row?.totalCashSales ?? 0),
  totalCardSales: Number(row?.totalCardSales ?? 0),
  totalCashPayouts: Number(row?.totalCashPayouts ?? 0),
  expectedCashInDrawer: Number(row?.expectedCashInDrawer ?? 0),
  actualCashCount: row?.actualCashCount !== null ? Number(row.actualCashCount) : undefined,
  difference: row?.difference !== null ? Number(row.difference) : undefined,
  bagsStartAmounts: row?.bags_start_amounts ?? {},
  bagsSalesAmounts: row?.bags_sales_amounts ?? {},
  bagsEndAmounts: row?.bags_end_amounts ?? {},
  previousSessionConfirmedAt: row?.previous_session_confirmed_at ? toDate(row.previous_session_confirmed_at) : undefined,
});

/**
 * Helper function to calculate totals on the fly
 * This bypasses the database triggers/RPCs which might have column name mismatches
 */
const enrichSessionWithTotals = async (session: CashSession): Promise<CashSession> => {
  try {
    // Fetch all sales for this session (using fallback logic for robustness)
    log.info(`Enriching session ${session.sessionId} with totals. Date range: ${session.openedAt} - ${session.closedAt || 'now'}`);

    const sales = await getSalesBySession(
      session.sessionId,
      session.openedBy,
      session.openedAt,
      session.closedAt || new Date()
    );

    log.info(`Found ${sales.length} sales for session ${session.sessionId}`);

    // Calculate totals
    let totalCashSales = 0;
    let totalCardSales = 0;

    for (const sale of sales) {
      if (sale.status === 'cancelled') continue;

      if (sale.paymentMethod === 'Efectivo') {
        totalCashSales += sale.totalAmount;
      } else if (sale.paymentMethod === 'Tarjeta de Crédito' || (sale.paymentMethod as string) === 'Tarjeta') {
        totalCardSales += sale.totalAmount;
      }
    }

    log.info(`Calculated totals: Cash=${totalCashSales}, Card=${totalCardSales}`);

    const expectedCashInDrawer = session.startingFloat + totalCashSales - session.totalCashPayouts;
    const difference = (session.actualCashCount || 0) - expectedCashInDrawer;

    return {
      ...session,
      totalCashSales,
      totalCardSales,
      expectedCashInDrawer,
      difference: session.actualCashCount !== undefined ? difference : undefined
    };
  } catch (error) {
    log.error("Error enriching session with totals", error);
    return session; // Return original session on error
  }
};

export const getAllClosedSessions = async (): Promise<CashSession[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .eq("status", "Cerrado")
      .order("closedAt", { ascending: false, nullsFirst: false });

    if (error) throw error;
    const sessions = (data ?? []).map(mapSession);
    const uniqueSessions = sessions.filter(
      (session, index, self) =>
        index === self.findIndex((s) => s.id === session.id)
    );
    return uniqueSessions;
  } catch (error) {
    log.error("Error fetching closed cash sessions", error);
    return [];
  }
};

export const getLastClosedSession = async (): Promise<CashSession | null> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .eq("status", "Cerrado")
      .order("closedAt", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Enrich with totals might not be strictly necessary if we stored them on close, 
    // but good for safety. However, for "Bag" balances, we trust the stored data?
    // The stored data has bags_end_amounts.
    return mapSession(data);
  } catch (error) {
    log.error("Error fetching last closed session", error);
    return null;
  }
};

export const getCurrentOpenSession = async (userId: string): Promise<CashSession | null> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .eq("status", "Abierto")
      .eq("openedBy", userId)
      .order("openedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    const session = mapSession(data);
    return await enrichSessionWithTotals(session);
  } catch (error) {
    log.error("Error fetching open session", error);
    throw new Error("Failed to fetch open session.");
  }
};

export const getAllOpenSessions = async (): Promise<CashSession[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .eq("status", "Abierto");

    if (error) throw error;
    return (data ?? []).map(mapSession);
  } catch (error) {
    log.error("Error fetching open sessions", error);
    return [];
  }
};

export const getSessionForDate = async (date: Date): Promise<CashSession | null> => {
  try {
    const supabase = getSupabaseServerClient();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .gte("openedAt", startOfDay.toISOString())
      .lte("openedAt", endOfDay.toISOString())
      .order("openedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return mapSession(data);
  } catch (error) {
    log.error("Error fetching session for date", error);
    return null;
  }
};

export const openCashSession = async (
  userId: string,
  userName: string,
  startingFloat: number,
  bagsStartAmounts: Record<string, number> = {},
  previousSessionConfirmedAt?: Date
): Promise<CashSession> => {
  const supabase = getSupabaseServerClient();
  const firestoreId = uuidv4();
  const sessionId = `CS-${uuidv4().split("-")[0].toUpperCase()}`;
  const openedAt = nowIso();

  const payload = {
    firestore_id: firestoreId,
    sessionId,
    status: "Abierto" as const,
    openedBy: userId,
    openedByName: userName,
    openedAt,
    startingFloat,
    totalCashSales: 0,
    totalCardSales: 0,
    totalCashPayouts: 0,
    expectedCashInDrawer: startingFloat,
    bags_start_amounts: bagsStartAmounts,
    bags_sales_amounts: {},
    bags_end_amounts: {},
    previous_session_confirmed_at: previousSessionConfirmedAt ? previousSessionConfirmedAt.toISOString() : null,
  };

  const { error } = await supabase.from(CASH_SESSIONS_TABLE).insert(payload);
  if (error) {
    log.error("Error opening cash session", error);
    throw new Error("Failed to open cash session.");
  }

  return mapSession(payload);
};

export const closeCashSession = async (
  session: CashSession,
  userId: string,
  userName: string,
  actualCashCount: number,
  bagsSalesAmounts: Record<string, number> = {}
): Promise<CashSession> => {
  const supabase = getSupabaseServerClient();

  // Fetch the latest session data to ensure we have up-to-date totals
  // The session object passed from client might be stale
  const { data: freshSessionData, error: fetchError } = await supabase
    .from(CASH_SESSIONS_TABLE)
    .select("*")
    .eq("firestore_id", session.id)
    .single();

  if (fetchError || !freshSessionData) {
    log.error("Error fetching fresh session data for closing", fetchError);
    throw new Error("Failed to fetch latest session data.");
  }

  const freshSession = mapSession(freshSessionData);

  // Recalculate totals one last time to be sure
  const enrichedSession = await enrichSessionWithTotals(freshSession);

  const expectedCashInDrawer = enrichedSession.startingFloat + enrichedSession.totalCashSales - enrichedSession.totalCashPayouts;
  const difference = actualCashCount - expectedCashInDrawer;
  const closedAt = nowIso();

  const { error } = await supabase
    .from(CASH_SESSIONS_TABLE)
    .update({
      status: "Cerrado",
      closedBy: userId,
      closedByName: userName,
      closedAt,
      actualCashCount,
      expectedCashInDrawer,
      difference,
      // Also update the calculated totals in DB so they are correct for history
      totalCashSales: enrichedSession.totalCashSales,
      totalCardSales: enrichedSession.totalCardSales,
      bags_sales_amounts: bagsSalesAmounts,
      bags_end_amounts: calculateBagsEndAmounts(freshSession.bagsStartAmounts || {}, bagsSalesAmounts)
    })
    .eq("firestore_id", session.id);

  if (error) {
    log.error("Error closing cash session", error);
    throw new Error("Failed to close cash session.");
  }

  // Automatically deposit the actual cash count to Caja Chica
  try {
    await depositToCajaChica(session.sessionId, actualCashCount);
  } catch (depositError) {
    log.error("Error depositing to Caja Chica during session close", depositError);
    // We don't throw here to avoid rolling back the session close, 
    // but we should probably alert the user or log it prominently.
    // For now, the session is closed, but the money might not be in Caja Chica.
  }

  return {
    ...enrichedSession,
    status: "Cerrado",
    closedBy: userId,
    closedByName: userName,
    closedAt: new Date(closedAt),
    actualCashCount,
    expectedCashInDrawer,
    difference,
  };
};

/**
 * Deposits a specified amount to Caja Chica account
 * This function should be called after cash session closure with explicit user verification
 */
export const depositToCajaChica = async (
  sessionId: string,
  depositAmount: number
): Promise<void> => {
  if (depositAmount < 0) {
    throw new Error("Deposit amount cannot be negative.");
  }

  if (depositAmount === 0) {
    log.info(`No deposit made for session ${sessionId} - amount is 0`);
    return;
  }

  const supabase = getSupabaseServerClient();

  try {
    // Find Caja Chica account
    const { data: cajaChicaAccount, error: findError } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("id,firestore_id,name")
      .eq("name", "Caja Chica")
      .maybeSingle();

    if (findError) {
      log.error("Error finding Caja Chica account", findError);
      throw new Error("Failed to find Caja Chica account.");
    }

    if (!cajaChicaAccount) {
      log.error("Caja Chica account not found");
      throw new Error("Caja Chica account does not exist.");
    }

    const accountId = cajaChicaAccount.firestore_id || cajaChicaAccount.id;

    // Use addIncome to record the transaction and update balance
    // This ensures it shows up in the transaction history
    await addIncome({
      description: `Depósito de Corte de Caja (Sesión: ${sessionId})`,
      category: "Corte de Caja",
      amount: depositAmount,
      destinationAccountId: accountId,
      source: "Caja",
      sessionId: sessionId
    });

    log.info(`Successfully deposited ${depositAmount} to Caja Chica for session ${sessionId}`);
  } catch (error) {
    log.error("Error in depositToCajaChica", error);
    throw error;
  }
};
