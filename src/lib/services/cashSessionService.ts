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
      .gte("openedAt", startOfDay.toISOString())
      .lte("openedAt", endOfDay.toISOString())
      .order("openedAt", { ascending: false })
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

export const openCashSession = async (
  userId: string,
  userName: string,
  startingFloat: number,
  bagsStartAmounts: Record<string, number> = {},
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
    bags_data: {
      start: bagsStartAmounts
    },
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
  cashLeftForNextSession: number = 0,
  balanceBagAccountId?: string,
  dailySalesAccountId?: string
): Promise<CashSession> => {
  const supabase = getSupabaseServerClient();

  try {
    // 1. Recalculate Totals
    const enrichedSession = await enrichSessionWithTotals(session);

    const expectedCashInDrawer = enrichedSession.startingFloat + enrichedSession.totalCashSales - enrichedSession.totalCashPayouts;
    const difference = actualCashCount - expectedCashInDrawer;
    const isBalanced = difference === 0;

    const now = new Date().toISOString();

    // 2. Database Update
    const updatePayload: any = {
      status: "Cerrado",
      closed_by: userId,
      closed_by_name: userName,
      closed_at: now,
      actual_cash_count: actualCashCount,
      expected_cash_in_drawer: expectedCashInDrawer,
      difference: difference,
      is_balanced: isBalanced,
      total_cash_sales: enrichedSession.totalCashSales,
      total_card_sales: enrichedSession.totalCardSales,
      bags_data: {
        start: session.bagsStartAmounts,
        sales: bagsSalesAmounts,
        end: bagsActualEndAmounts
      },
      cash_left_for_next_session: cashLeftForNextSession,
    };

    if (balanceBagAccountId) {
      updatePayload.balance_bag_account_id = balanceBagAccountId;
      updatePayload.balance_bag_amount = cashLeftForNextSession;
    }

    if (dailySalesAccountId) {
      updatePayload.daily_sales_account_id = dailySalesAccountId;
    }

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

    // 3. Deposit to Accounts

    // 3a. Main Deposit (Net Cash Sales / Profit)
    // Priority: Explicit depositAccountId > dailySalesAccountId
    const mainDepositAccount = depositAccountId || dailySalesAccountId;
    const netDepositAmount = actualCashCount - cashLeftForNextSession;

    if (mainDepositAccount && netDepositAmount > 0) {
      const depositNote = depositAccountId ? undefined : "Ventas Diarias";
      await depositToAccount(
        session.sessionId,
        mainDepositAccount,
        netDepositAmount,
        depositNote,
        "Corte de Caja"
      );
    }

    // 3b. Balance Bag Deposits
    // If specific accounts were selected for balance bags, deposit their respective amounts
    if (balanceBagAccountId) {
      try {
        let balanceBagAccounts: Record<string, string> = {};
        // Handle both JSON string or object (if type confusion occurs)
        if (typeof balanceBagAccountId === 'string') {
          // If it looks like JSON, parse it
          if (balanceBagAccountId.startsWith('{')) {
            balanceBagAccounts = JSON.parse(balanceBagAccountId);
          } else {
            log.warn("balanceBagAccountId is not a JSON object:", balanceBagAccountId);
          }
        } else if (typeof balanceBagAccountId === 'object') {
          balanceBagAccounts = balanceBagAccountId;
        }

        // Log para debugging
        console.log('[Balance Bag] Processing deposits:', {
          balanceBagAccounts,
          bagsActualEndAmounts,
          rawBalanceBagAccountId: balanceBagAccountId
        });

        // Iterate through known bag types
        const bagTypes = ['recargas', 'mimovil', 'servicios'];

        for (const type of bagTypes) {
          const accountId = balanceBagAccounts[type];
          const startAmount = session.bagsStartAmounts?.[type] || 0;
          const endAmount = bagsActualEndAmounts[type] || 0;
          // Calculate sales: what was sold from the bag (start - end)
          // This is the amount that should be deposited to the account, NOT the end amount
          const salesAmount = startAmount - endAmount;

          console.log(`[Balance Bag] ${type}: accountId=${accountId}, start=${startAmount}, end=${endAmount}, sales=${salesAmount}`);

          if (accountId && salesAmount > 0) {
            console.log(`[Balance Bag] Depositing ${salesAmount} (sales) to ${accountId} for ${type}`);
            await depositToAccount(
              session.sessionId,
              accountId,
              salesAmount,
              `Bolsa de Saldo - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
              "Bolsa de Saldo"
            );
            console.log(`[Balance Bag] ✅ Deposit successful for ${type}`);
          } else if (salesAmount <= 0) {
            console.log(`[Balance Bag] ⏭️ Skipping ${type}: no sales or negative balance (salesAmount=${salesAmount})`);
          } else {
            console.log(`[Balance Bag] ⏭️ Skipping ${type}: no account selected`);
          }
        }
      } catch (e) {
        log.error("Error processing balance bag deposits", e);
        // Don't fail the entire closure if bag deposits fail?
        // Or should we? For now, log and continue to ensure session closes.
      }
    } else {
      console.log('[Balance Bag] No balance bag account ID provided, skipping balance bag deposits');
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
