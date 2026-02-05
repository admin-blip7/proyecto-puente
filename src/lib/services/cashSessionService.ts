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

/**
 * REFACTORING NOTE: mapSession handles both old (with bag data) and new (simplified) sessions
 * 
 * To maintain backward compatibility with existing database records that contain bag data,
 * this function still reads bag-related fields from the database.
 * However, these fields are no longer used in the simplified closing workflow.
 * 
 * New sessions will not populate these fields as they've been removed from
 * openCashSession and closeCashSession functions.
 * 
 * @param row - Database row from cash_sessions table
 * @returns Mapped CashSession object
 */
const mapSession = (row: any): CashSession => ({
  id: row?.id ?? "",
  sessionId: row?.session_number ?? row?.sessionId ?? "",
  status: row?.status ?? "Abierto",
  openedBy: row?.opened_by ?? "",
  openedByName: row?.opened_by_name ?? "",
  openedAt: toDate(row?.opened_at),
  startingFloat: Number(row?.starting_float ?? 0),
  closedBy: row?.closed_by ?? undefined,
  closedByName: row?.closed_by_name ?? undefined,
  closedAt: row?.closed_at ? toDate(row.closed_at) : undefined,
  totalCashSales: Number(row?.total_cash_sales ?? 0),
  totalCardSales: Number(row?.total_card_sales ?? 0),
  totalCashPayouts: Number(row?.total_cash_payouts ?? 0),
  expectedCashInDrawer: Number(row?.expected_cash_in_drawer ?? 0),
  actualCashCount: row?.actual_cash_count !== null ? Number(row.actual_cash_count) : undefined,
  difference: row?.difference !== null ? Number(row.difference) : undefined,
  isBalanced: row?.is_balanced ?? false,
  // NEW: Variance type for surplus/shortage/balanced classification
  varianceType: row?.variance_type ?? undefined,
  // BACKWARD COMPATIBILITY: These fields still read from DB for old sessions
  // but are no longer populated in new simplified workflow
  bagsSalesAmounts: row?.bags_data?.sales ?? row?.bags_sales_amounts ?? {},
  bagsStartAmounts: row?.bags_data?.start ?? row?.bags_start_amounts ?? {},
  bagsEndAmounts: row?.bags_data?.end ?? row?.bags_end_amounts ?? {},
  previousSessionConfirmedAt: row?.previous_session_confirmed_at ? toDate(row.previous_session_confirmed_at) : undefined,
  cashLeftForNextSession: row?.cash_left_for_next_session !== null && row?.cash_left_for_next_session !== undefined ? Number(row.cash_left_for_next_session) : undefined,
  balanceBagAccountId: row?.balance_bag_account_id ?? undefined,
  balanceBagAmount: row?.balance_bag_amount !== null && row?.balance_bag_amount !== undefined ? Number(row.balance_bag_amount) : undefined,
});

/**
 * Helper function to calculate totals on the fly
 */
const enrichSessionWithTotals = async (session: CashSession): Promise<CashSession> => {
  try {
    // Fetch all sales for this session
    const sales = await getSalesBySession(
      session.id, // Usar UUID ahora
      session.openedBy,
      session.openedAt,
      session.closedAt || new Date()
    );

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
      .order("closed_at", { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data ?? []).map(mapSession);
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
      .order("closed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

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
      .eq("opened_by", userId)
      .order("opened_at", { ascending: false })
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

// Get any session (open or closed) for a specific date
export const getSessionForDate = async (date: Date): Promise<CashSession | null> => {
  try {
    const supabase = getSupabaseServerClient();

    // Create date range for the given day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .gte("opened_at", startOfDay.toISOString())
      .lte("opened_at", endOfDay.toISOString())
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      log.error("Error fetching session for date", error);
      throw error;
    }

    return data ? mapSession(data) : null;
  } catch (error) {
    log.error("Error in getSessionForDate", error);
    throw new Error("Failed to fetch session for date.");
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

/**
 * CASH FLOAT MANAGEMENT FEATURE: Enhanced opening process with float support
 * 
 * This function now supports automatic float carryover from previous session:
 * - Optional closingFloat parameter can be used as the default starting float
 * - This allows the system to automatically use the previous session's closing float
 * - Users can verify or adjust the amount before confirming
 * 
 * Previous complexity eliminated (from refactoring):
 * - Removed bags_data, bags_start_amounts - no longer tracking balance bags
 * 
 * CASH FLOAT MANAGEMENT ADDED BACK:
 * - closingFloat parameter can be passed as default startingFloat
 * - Enables automatic float carryover between shifts
 * - User can verify or adjust the amount in OpenSessionWizard
 *
 * @param userId - User ID opening the session
 * @param userName - Name of the user opening the session
 * @param startingFloat - Initial cash amount in the drawer
 * @param previousSessionConfirmedAt - Optional timestamp when previous session was confirmed
 * @returns The newly created cash session
 */
export const openCashSession = async (
  userId: string,
  userName: string,
  startingFloat: number,
  previousSessionConfirmedAt?: Date
): Promise<CashSession> => {
  const supabase = getSupabaseServerClient();
  const sessionId = `CS-${uuidv4().split("-")[0].toUpperCase()}`;

  const newSession = {
    session_number: sessionId,
    opened_by: userId,
    opened_by_name: userName,
    opened_at: new Date().toISOString(),
    starting_float: startingFloat,
    status: "Abierto",
    // SIMPLIFICATION: Removed bags_data, bags_start_amounts - no longer tracking balance bags
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

/**
 * CASH FLOAT MANAGEMENT FEATURE: Enhanced closing process with float support
 *
 * This function now handles cash float management for the POS system:
 * 1. actualCashCount - The total cash counted in the drawer
 * 2. depositAccountId - The target account for depositing the NET amount
 * 3. closingFloat - Amount of cash to leave in drawer for next shift (float money)
 *
 * Cash Float Logic:
 * - Deposit Amount = actualCashCount - closingFloat
 * - Opening Float (next shift) = Closing Float (current shift)
 * - Float money is excluded from sales reporting
 * - Net Cash Sales = (actualCashCount - startingFloat - closingFloat)
 *
 * Previous complexity eliminated (from refactoring):
 * - No more bagsSalesAmounts tracking (recargas, mimovil, servicios)
 * - No more bagsActualEndAmounts calculations
 * - No more balanceBagAccountId (single deposit account instead of multiple)
 * - No more dailySalesAccountId (consolidated into single deposit)
 *
 * CASH FLOAT MANAGEMENT ADDED BACK:
 * - closingFloat parameter to retain change money between shifts
 * - cashLeftForNextSession field is persisted to database
 * - Only net amount (actualCashCount - closingFloat) is deposited
 *
 * Error Handling:
 * - Validates that depositAccountId exists before processing
 * - Validates closingFloat is non-negative and doesn't exceed actualCashCount
 * - Ensures deposit amount is positive
 * - Provides clear error messages for validation failures
 *
 * @param session - The cash session to close
 * @param userId - User ID closing the session
 * @param userName - Name of the user closing the session
 * @param actualCashCount - Total cash counted in drawer
 * @param depositAccountId - Target account ID for the deposit (required)
 * @param closingFloat - Amount to leave in drawer for next shift (float money)
 * @returns The updated closed cash session
 * @throws Error if depositAccountId is not provided or account doesn't exist
 */
export const closeCashSession = async (
  session: CashSession,
  userId: string,
  userName: string,
  actualCashCount: number,
  depositAccountId?: string,
  closingFloat?: number
): Promise<CashSession> => {
  const supabase = getSupabaseServerClient();

  // VALIDATION: Determine if deposit account validation is required
  // Auto-closed sessions (from cron) pass empty string to skip deposit
  const isDepositRequired = depositAccountId !== undefined && depositAccountId.trim() !== "";

  if (isDepositRequired) {
    if (!depositAccountId || depositAccountId.trim() === "") {
      const error = new Error("Deposit account ID is required. Please select a valid deposit account.");
      log.error("closeCashSession validation failed: No deposit account provided", { session: session.sessionId });
      throw error;
    }
  }

  // CASH FLOAT MANAGEMENT: Validate closing float
  const floatAmount = closingFloat || 0;
  if (floatAmount < 0) {
    const error = new Error("Closing float cannot be negative.");
    log.error("closeCashSession validation failed: Negative closing float", { session: session.sessionId, closingFloat });
    throw error;
  }

  if (floatAmount > actualCashCount) {
    const error = new Error("Closing float cannot exceed total cash count.");
    log.error("closeCashSession validation failed: Float exceeds cash count", {
      session: session.sessionId,
      actualCashCount,
      closingFloat: floatAmount
    });
    throw error;
  }

  try {
    // 1. Recalculate Totals
    const enrichedSession = await enrichSessionWithTotals(session);

    const expectedCashInDrawer = enrichedSession.startingFloat + enrichedSession.totalCashSales - enrichedSession.totalCashPayouts;
    const difference = actualCashCount - expectedCashInDrawer;
    const isBalanced = difference === 0;

    const now = new Date().toISOString();

    // 2. Database Update
    // CASH FLOAT MANAGEMENT: Now storing closing_float (cash_left_for_next_session)
    // VARIANCE CLASSIFICATION: Calculate and store variance type (surplus/shortage/balanced)
    const varianceType = difference === 0 ? 'balanced' : (difference > 0 ? 'surplus' : 'shortage');

    const updatePayload: any = {
      status: "Cerrado",
      closed_by: userId,
      closed_by_name: userName,
      closed_at: now,
      actual_cash_count: actualCashCount,
      expected_cash_in_drawer: expectedCashInDrawer,
      difference: difference,
      is_balanced: isBalanced,
      // NEW: Variance type for clearer surplus/shortage/balanced classification
      variance_type: varianceType,
      total_cash_sales: enrichedSession.totalCashSales,
      total_card_sales: enrichedSession.totalCardSales,
      // CASH FLOAT MANAGEMENT: Persist closing float to database
      cash_left_for_next_session: floatAmount,
    };

    const { data: updatedData, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .update(updatePayload)
      .eq("id", session.id)
      .select()
      .single();

    if (error) {
      log.error("Error closing cash session (DB Update)", error);
      throw new Error("Failed to close cash session.");
    }

    // 3. Deposit to Account
    // CASH FLOAT MANAGEMENT: Only deposit net amount (actualCashCount - closingFloat)
    // Float money remains in drawer for next shift and is NOT deposited
    const depositAmount = actualCashCount - floatAmount;
    if (depositAmount > 0 && depositAccountId) {
      await depositToAccount(
        session.sessionId,
        depositAccountId,
        depositAmount,
        `Corte de Caja - Ventas Netas (Total: ${actualCashCount}, Float: ${floatAmount})`,
        "Corte de Caja"
      );
      log.info(`Deposited ${depositAmount} to account ${depositAccountId} for session ${session.sessionId}. Float ${floatAmount} retained in drawer.`);
    } else if (floatAmount > 0) {
      log.info(`No deposit made for session ${session.sessionId} - all cash (${floatAmount}) retained as float for next shift.`);
    } else {
      log.info(`No deposit made for session ${session.sessionId} - amount is 0`);
    }

    revalidatePath('/pos');
    return mapSession(updatedData);

  } catch (fatalError: any) {
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
  notes?: string,
  category?: string
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
    // CRITICAL FIX: Allow custom category to separate balance bag deposits from operational cash
    await addIncome({
      description: `Depósito de Corte de Caja (Sesión: ${sessionId}) ${notes ? `- ${notes}` : ''}`,
      category: category || "Corte de Caja",
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
