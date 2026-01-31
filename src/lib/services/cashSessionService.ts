"use server";

import { v4 as uuidv4 } from "uuid";
import { CashSession } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";
import { getSalesBySession } from "./salesService";
import { addIncome } from "./incomeService";
import { revalidatePath } from "next/cache";

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
  id: row?.id ?? "",
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
  isBalanced: row?.is_balanced ?? row?.isBalanced ?? false,
  bagsSalesAmounts: row?.bags_sales_amounts ?? {},
  bagsEndAmounts: row?.bags_end_amounts ?? {},
  previousSessionConfirmedAt: row?.previous_session_confirmed_at ? toDate(row.previous_session_confirmed_at) : undefined,
  cashLeftForNextSession: row?.cash_left_for_next_session !== null && row?.cash_left_for_next_session !== undefined ? Number(row.cash_left_for_next_session) : undefined,
});

/**
 * Helper function to calculate totals on the fly
 * This bypasses the database triggers/RPCs which might have column name mismatches
 */
const enrichSessionWithTotals = async (session: CashSession): Promise<CashSession> => {
  try {
    // Fetch all sales for this session (using fallback logic for robustness)
    log.info(`Enriching session ${session.sessionId} with totals. Date range: ${session.openedAt} - ${session.closedAt || 'now'}`);

    // Wrap the sales fetch in a sub-try/catch because it calls another service
    let sales: any[] = [];
    try {
      sales = await getSalesBySession(
        session.sessionId,
        session.openedBy,
        session.openedAt,
        session.closedAt || new Date()
      );
      log.info(`Found ${sales.length} sales for session ${session.sessionId}`);
    } catch (salesError) {
      log.error(`Critical error fetching sales for session ${session.sessionId}:`, salesError);
      // Continue with empty sales to avoid crashing the whole process
      sales = [];
    }

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
    // Return original session on error to be safe
    return session;
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
        index === self.findIndex((s) => s.sessionId === session.sessionId)
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

// Helper to create Firestore-compatible timestamp for legacy sorting compatibility
const createTimestamp = () => ({
  _seconds: Math.floor(Date.now() / 1000),
  _nanoseconds: 0
});

const generateSessionId = () => `CS-${uuidv4().split("-")[0].toUpperCase()}`;

export const openCashSession = async (
  userId: string,
  userName: string,
  startingFloat: number,
  bagsStartAmounts: Record<string, number> = {},
  previousSessionConfirmedAt?: Date
): Promise<CashSession> => {
  const supabase = getSupabaseServerClient();
  const sessionId = generateSessionId();

  // Use Object format for openedAt to match legacy data structure and ensure correct JSONB sorting
  const openedAtObj = createTimestamp();

  const newSession = {
    sessionId,
    openedBy: userId,
    openedByName: userName,
    openedAt: openedAtObj,
    startingFloat,
    status: "Abierto",
    bags_start_amounts: bagsStartAmounts,
    previous_session_confirmed_at: previousSessionConfirmedAt
  };

  const { data, error } = await supabase
    .from(CASH_SESSIONS_TABLE)
    .insert(newSession)
    .select()
    .single();

  if (error) {
    log.error("Error opening cash session", error);
    throw error;
  }

  revalidatePath('/pos');
  return mapSession(data);
};

export const closeCashSession = async (
  session: CashSession,
  userId: string,
  userName: string,
  actualCashCount: number,
  bagsSalesAmounts: Record<string, number> = {},
  bagsActualEndAmounts: Record<string, number> = {},
  depositAccountId?: string,
  cashLeftForNextSession: number = 0
): Promise<CashSession> => {
  console.log(`[closeCashSession] Starting for session ${session.sessionId}`);
  const supabase = getSupabaseServerClient();

  try {
    // 1. Fetch Fresh Session
    console.log(`[closeCashSession] Fetching fresh session data...`);
    const { data: freshSessionData, error: fetchError } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .eq("sessionId", session.sessionId)
      .single();

    if (fetchError || !freshSessionData) {
      console.error(`[closeCashSession] Error fetching fresh data: ${fetchError?.message}`);
      log.error("Error fetching fresh session data for closing", fetchError);
      throw new Error("Failed to fetch latest session data.");
    }

    const freshSession = mapSession(freshSessionData);
    console.log(`[closeCashSession] Fresh session fetched. Status: ${freshSession.status}`);

    // 2. Recalculate Totals
    console.log(`[closeCashSession] Enriching session with totals...`);
    let enrichedSession;
    try {
      enrichedSession = await enrichSessionWithTotals(freshSession);
      console.log(`[closeCashSession] Enrichment complete. Totals: Cash=${enrichedSession.totalCashSales}, Card=${enrichedSession.totalCardSales}`);
    } catch (enrichError) {
      console.error(`[closeCashSession] Enrichment failed completely, using fresh session:`, enrichError);
      enrichedSession = freshSession;
    }

    const expectedCashInDrawer = enrichedSession.startingFloat + enrichedSession.totalCashSales - enrichedSession.totalCashPayouts;
    const difference = actualCashCount - expectedCashInDrawer;
    const isBalanced = difference === 0;

    // Use Object format for closedAt to match legacy data structure and ensure correct JSONB sorting
    const closedAtObj = createTimestamp();
    const closedAtDate = new Date(); // distinct valid Date object for return value

    // 3. Calculate Bag End Amounts
    console.log(`[closeCashSession] Calculating bag amounts...`);
    const bagsExpectedEndAmounts = calculateBagsEndAmounts(freshSession.bagsStartAmounts || {}, bagsSalesAmounts);
    const finalBagsEndAmounts: Record<string, number> = {};
    for (const key of ['recargas', 'mimovil', 'servicios']) {
      finalBagsEndAmounts[key] = bagsActualEndAmounts[key] !== undefined
        ? bagsActualEndAmounts[key]
        : bagsExpectedEndAmounts[key] || 0;
    }

    // 4. Update Database
    console.log(`[closeCashSession] Updating database...`);
    const updatePayload = {
      status: "Cerrado",
      closedBy: userId,
      closedByName: userName,
      closedAt: closedAtObj,
      actualCashCount,
      expectedCashInDrawer,
      difference,
      is_balanced: isBalanced,
      totalCashSales: enrichedSession.totalCashSales,
      totalCardSales: enrichedSession.totalCardSales,
      bags_sales_amounts: bagsSalesAmounts,
      bags_end_amounts: finalBagsEndAmounts,
      cash_left_for_next_session: cashLeftForNextSession,
    };

    const { data: updatedData, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .update(updatePayload)
      .eq("sessionId", session.sessionId)
      .select();

    if (error) {
      console.error(`[closeCashSession] Database update failed: ${error.message}`);
      log.error("Error closing cash session (DB Update)", error);
      throw new Error("Failed to close cash session.");
    }

    if (!updatedData || updatedData.length === 0) {
      console.warn(`[closeCashSession] No rows updated with id, trying sessionId fallback...`);
      const { data: retryData, error: retryError } = await supabase
        .from(CASH_SESSIONS_TABLE)
        .update({ status: "Cerrado", closedAt: closedAtObj })
        .eq("sessionId", session.sessionId)
        .select();

      if (retryError || !retryData || retryData.length === 0) {
        console.error(`[closeCashSession] Fallback update also failed.`);
        throw new Error("Failed to close session: No rows updated.");
      }
      console.log(`[closeCashSession] Fallback update successful.`);
    } else {
      console.log(`[closeCashSession] Database update successful.`);
    }

    // 5. Deposit to Account (if specified)
    if (depositAccountId) {
      // Deposit the difference: Actual Cash - Cash Left for Next Session
      // If result is negative/zero, we handle it (though logically actual should be >= left)
      const amountToDeposit = Math.max(0, actualCashCount - cashLeftForNextSession);

      console.log(`[closeCashSession] Attempting deposit to account ${depositAccountId}...`);
      console.log(`[closeCashSession] Net deposit: ${amountToDeposit} (Actual: ${actualCashCount} - Left: ${cashLeftForNextSession})`);

      if (amountToDeposit > 0) {
        try {
          await depositToAccount(session.sessionId, depositAccountId, amountToDeposit);
          console.log(`[closeCashSession] Deposit successful.`);
        } catch (depositError) {
          console.error(`[closeCashSession] Deposit failed:`, depositError);
          log.error("Error depositing to account during session close", depositError);
        }
      } else {
        console.log(`[closeCashSession] Deposit skipped (Amount <= 0).`);
      }
    } else {
      console.log(`[closeCashSession] No deposit account specified, skipping deposit.`);
    }

    console.log(`[closeCashSession] Session close process completed successfully.`);

    revalidatePath('/pos');
    revalidatePath('/admin/finance/cash-history');

    return {
      ...enrichedSession,
      status: "Cerrado",
      closedBy: userId,
      closedByName: userName,
      closedAt: closedAtDate,
      actualCashCount,
      expectedCashInDrawer,
      difference,
      isBalanced,
      bagsEndAmounts: finalBagsEndAmounts,
      cashLeftForNextSession,
    };

  } catch (fatalError: any) {
    console.error(`[closeCashSession] FATAL ERROR:`, fatalError);
    log.error("Fatal error in closeCashSession", fatalError);
    throw fatalError;
  }
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
      .select("id,name")
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

    // Use the actual database id as the targetAccountId
    const accountId = cajaChicaAccount.id;
    console.log(`[depositToCajaChica] Found Caja Chica: DB ID: ${accountId}, Using target ID: ${accountId}`);

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

export const depositToAccount = async (
  sessionId: string,
  accountId: string,
  depositAmount: number,
  notes?: string
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
    // Check if account exists - use the actual database id for accurate lookup
    const { data: account, error: findError } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("id,name")
      .eq("id", accountId)
      .maybeSingle();

    if (findError) {
      log.error("Error finding account", findError);
      throw new Error("Failed to find account.");
    }

    if (!account) {
      log.error("Account not found", { accountId });
      throw new Error(`Account does not exist. ID: ${accountId}`);
    }

    // Use the actual database id as targetAccountId
    const targetAccountId = account.id;
    console.log(`[depositToAccount] Found account: ${account.name}, DB ID: ${account.id}, Using target ID: ${targetAccountId}`);

    // Use addIncome to record the transaction and update balance
    await addIncome({
      description: `Depósito de Corte de Caja (Sesión: ${sessionId}) ${notes ? `- ${notes}` : ''}`,
      category: "Corte de Caja",
      amount: depositAmount,
      destinationAccountId: targetAccountId,
      source: "Caja",
      sessionId: sessionId
    });

    log.info(`Successfully deposited ${depositAmount} to account ${account.name} for session ${sessionId}`);
  } catch (error) {
    log.error("Error in depositToAccount", error);
    throw error;
  }
};
