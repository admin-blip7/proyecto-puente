"use server";

import { Expense } from "@/types";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";
import { uploadFile } from "./documentService";
import { toDate, nowIso } from "@/lib/supabase/utils";

const log = getLogger("financeService");

const EXPENSES_TABLE = "expenses";
const CASH_SESSIONS_TABLE = "cash_sessions";
const ACCOUNTS_TABLE = "accounts";
const DAILY_EARNINGS_TABLE = "daily_earnings";
const PAYMENT_PLANS_TABLE = "paymentPlans";
const CONTRACTS_TABLE = "contracts";
const STORAGE_RECEIPTS_PATH = "receipts";

const mapExpense = (row: any): Expense => {
  // Use id, then expenseId, then a hash of description + amount + date
  const id = row?.id ??
    row?.expenseId ??
    `fallback-${row?.description}-${row?.amount}-${row?.paymentDate}`;

  return {
    id: String(id),
    expenseId: row?.expenseId ?? "",
    description: row?.description ?? "",
    category: row?.category ?? "",
    amount: Number(row?.amount ?? 0),
    paidFromAccountId: row?.paidFromAccountId ?? "",
    paymentDate: toDate(row?.paymentDate),
    receiptUrl: row?.receiptUrl ?? undefined,
    sessionId: row?.sessionId ?? undefined,
  };
};

export const getExpenses = async (): Promise<Expense[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(EXPENSES_TABLE)
      .select("*")
      .order("paymentDate", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapExpense);
  } catch (error) {
    log.error("Error fetching expenses", error);
    return [];
  }
};

export const getExpensesByDateRange = async (startDate: Date, endDate: Date): Promise<Expense[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(EXPENSES_TABLE)
      .select("*")
      .gte("paymentDate", startDate.toISOString())
      .lte("paymentDate", endDate.toISOString())
      .order("paymentDate", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapExpense);
  } catch (error) {
    log.error("Error fetching expenses by date range", error);
    return [];
  }
};

export const getExpensesBySession = async (
  sessionId: string,
  startDate?: Date,
  endDate?: Date
): Promise<Expense[]> => {
  try {
    const supabase = getSupabaseServerClient();

    // Since the expenses table doesn't seem to have a sessionId column yet,
    // we MUST use the date range fallback.

    if (startDate && endDate) {
      // Fetch expenses within the session time range
      // We use a limit to avoid fetching too many, and filter in memory for safety
      const { data, error } = await supabase
        .from(EXPENSES_TABLE)
        .select("*")
        .order("paymentDate", { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      const expenses = (data ?? []).map(mapExpense);

      // Filter by date range in memory
      return expenses.filter(exp => {
        if (!exp.paymentDate) return false;
        return exp.paymentDate >= startDate && exp.paymentDate <= endDate;
      });
    }

    // If no dates provided, return empty (cannot link by ID)
    return [];
  } catch (error) {
    log.error("Error fetching expenses by session", error);
    return [];
  }
};

export const getDailySalesStats = async (startDate: Date, endDate: Date): Promise<{ createdAt: string; totalAmount: number }[]> => {
  try {
    const supabase = getSupabaseServerClient();

    // Fetch ALL sales (we'll filter by date client-side since Firestore timestamps don't work with Postgres date filters)
    const { data, error } = await supabase
      .from("sales")
      .select("createdAt, totalAmount, status");

    if (error) throw error;

    const sales = data ?? [];

    // Filter by date range
    const filteredSales = sales
      .filter((sale: any) => {
        if (!sale.createdAt) return false;

        const saleDate = toDate(sale.createdAt);

        return saleDate >= startDate && saleDate <= endDate &&
          (sale.status === 'completed' || !sale.status); // Include completed or null status
      })
      .map((s: any) => {
        return {
          createdAt: toDate(s.createdAt).toISOString(),
          totalAmount: Number(s.totalAmount)
        };
      });

    return filteredSales;
  } catch (error) {
    log.error("Error fetching daily sales stats", error);
    return [];
  }
};

export const getCOGSByDateRange = async (startDate: Date, endDate: Date): Promise<number> => {
  try {
    const supabase = getSupabaseServerClient();

    // Fetch all sales with items
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("items, status, createdAt");

    if (salesError) throw salesError;

    // Filter by date range
    const filteredSales = (sales || []).filter((sale: any) => {
      if (!sale.createdAt) return false;

      const saleDate = toDate(sale.createdAt);

      return saleDate >= startDate && saleDate <= endDate &&
        (sale.status === 'completed' || !sale.status);
    });

    // Collect all unique product IDs
    const productIds = new Set<string>();
    filteredSales.forEach((sale: any) => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          if (item.productId) productIds.add(item.productId);
        });
      }
    });

    // Fetch product costs
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, cost")
      .in("id", Array.from(productIds));

    if (productsError) throw productsError;

    // Create product cost map
    const costMap = new Map<string, number>();
    (products || []).forEach((p: any) => {
      costMap.set(p.id, Number(p.cost) || 0);
    });

    // Calculate total COGS
    let totalCOGS = 0;
    filteredSales.forEach((sale: any) => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const cost = costMap.get(item.productId) || 0;
          const quantity = item.quantity || 1;
          totalCOGS += cost * quantity;
        });
      }
    });

    return totalCOGS;
  } catch (error) {
    log.error("Error calculating COGS", error);
    return 0;
  }
};

const uploadReceipt = async (file: File, expenseId: string): Promise<string> => {
  // Sanitize the filename to remove special characters that cause StorageApiError
  const sanitizeFilename = (filename: string): string => {
    return filename
      .normalize('NFD') // Normalize to decompose accents
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special characters with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  const sanitizedFilename = sanitizeFilename(file.name);
  const filePath = `${STORAGE_RECEIPTS_PATH}/${expenseId}-${sanitizedFilename}`;
  return uploadFile(file, filePath);
};

export const addExpense = async (
  expenseData: Omit<Expense, "id" | "expenseId" | "paymentDate" | "receiptUrl">,
  receiptFile?: File,
  userId?: string
): Promise<Expense> => {
  if (!expenseData.paidFromAccountId) {
    throw new Error("La cuenta de origen del pago es requerida.");
  }

  // Check if we have admin privileges (Service Role Key)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === 'production') {
    console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Expense creation might fail due to RLS.");
  }

  const supabase = getSupabaseServerClient();
  const expenseId = `EXP-${uuidv4().split("-")[0].toUpperCase()}`;
  const paymentDate = nowIso();

  let receiptUrl: string | undefined;
  if (receiptFile) {
    receiptUrl = await uploadReceipt(receiptFile, expenseId);
  }

  let activeSession: any = null;
  if (userId) {
    const { data: sessionData, error: sessionError } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .eq("status", "Abierto")
      .eq("openedBy", userId)
      .order("openedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      log.warn("Error locating active session", sessionError);
    }
    activeSession = sessionData ?? null;
  }

  const expensePayload = {
    expenseId,
    description: expenseData.description,
    category: expenseData.category,
    amount: expenseData.amount,
    paidFromAccountId: expenseData.paidFromAccountId,
    paymentDate,
    receiptUrl: receiptUrl ?? null,
    sessionId: activeSession ? activeSession.sessionId : (expenseData.sessionId || null),
  };

  const { data: insertedExpense, error: insertError } = await supabase
    .from(EXPENSES_TABLE)
    .insert(expensePayload)
    .select("*")
    .single();

  if (insertError) {
    log.error("Error inserting expense", {
      insertError,
      expensePayload: {
        ...expensePayload,
        hasValidAccountId: !!expensePayload.paidFromAccountId
      }
    });
    throw new Error(`No se pudo registrar el gasto: ${insertError.message}`);
  }

  // Get account to update balance
  const { data: accountRow, error: accountError } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("id,current_balance")
    .eq("id", expenseData.paidFromAccountId)
    .maybeSingle();

  if (accountError || !accountRow) {
    log.error("Error fetching account for expense", { accountError, accountId: expenseData.paidFromAccountId });
    // ROLLBACK
    await supabase.from(EXPENSES_TABLE).delete().eq("id", insertedExpense.id);
    throw new Error(`No se encontró la cuenta seleccionada. ID: ${expenseData.paidFromAccountId}`);
  }

  const newBalance = Number(accountRow.current_balance ?? 0) - expenseData.amount;
  // Update account balance
  const { error: accountUpdateError } = await supabase
    .from(ACCOUNTS_TABLE)
    .update({ current_balance: newBalance })
    .eq("id", expenseData.paidFromAccountId);

  if (accountUpdateError) {
    log.error("Failed to update account balance", accountUpdateError);
    // ROLLBACK
    await supabase.from(EXPENSES_TABLE).delete().eq("id", insertedExpense.id);
    throw new Error("Falló la actualización del saldo de la cuenta. Se canceló el registro del gasto.");
  }

  if (activeSession) {
    const newTotalPayouts = Number(activeSession.totalCashPayouts ?? 0) + expenseData.amount;
    const expectedCashInDrawer =
      Number(activeSession.startingFloat ?? 0) + Number(activeSession.totalCashSales ?? 0) - newTotalPayouts;

    // Update the session
    const { error: sessionUpdateError } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .update({
        totalCashPayouts: newTotalPayouts,
        expectedCashInDrawer,
      })
      .eq("sessionId", activeSession.sessionId);

    if (sessionUpdateError) {
      log.warn("Failed to update cash session with expense", sessionUpdateError);
    }
  }

  try {
    return mapExpense(insertedExpense);
  } catch (mapError) {
    log.error("Error mapping expense response", mapError);
    throw new Error("Gasto registrado pero hubo un error al procesar la respuesta.");
  }
};

export const addInterestEarnings = async (
  amount: number,
  clientId: string,
  clientName: string,
  description?: string
): Promise<void> => {
  const supabase = getSupabaseServerClient();
  const today = new Date();
  const dateKey = today.toISOString().split("T")[0];
  const timestamp = nowIso();

  const earningsEntry = {
    date: timestamp,
    dateKey,
    type: "interest",
    amount,
    clientId,
    clientName,
    description: description || `Ganancia por intereses - ${clientName}`,
    createdAt: timestamp,
  };

  const { data: existingRow, error: fetchError } = await supabase
    .from(DAILY_EARNINGS_TABLE)
    .select("*")
    .eq("dateKey", dateKey)
    .maybeSingle();

  if (fetchError) {
    log.warn("Error fetching daily earnings", fetchError);
  }

  if (!existingRow) {
    const insertPayload = {
      dateKey,
      date: timestamp,
      totalInterestEarnings: amount,
      totalEarnings: amount,
      interestTransactions: [earningsEntry],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { error: insertError } = await supabase.from(DAILY_EARNINGS_TABLE).insert(insertPayload);
    if (insertError) {
      log.error("Error inserting daily earnings", insertError);
    }
    return;
  }

  const existingTransactions = Array.isArray(existingRow.interestTransactions)
    ? existingRow.interestTransactions
    : [];

  const { error: updateError } = await supabase
    .from(DAILY_EARNINGS_TABLE)
    .update({
      totalInterestEarnings: Number(existingRow.totalInterestEarnings ?? 0) + amount,
      totalEarnings: Number(existingRow.totalEarnings ?? 0) + amount,
      interestTransactions: [...existingTransactions, earningsEntry],
      updatedAt: timestamp,
    })
    .eq("id", existingRow.id);

  if (updateError) {
    log.error("Error updating daily earnings", updateError);
  }
};

export async function generatePaymentPlan(
  clientId: string,
  creditAmount: number,
  interestRate: number,
  termInMonths: number = 12
) {
  try {
    const supabase = getSupabaseServerClient();
    const monthlyRate = interestRate / 100 / 12;
    const monthlyPayment =
      monthlyRate === 0
        ? creditAmount / termInMonths
        : (creditAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termInMonths));

    let remainingBalance = creditAmount;
    const paymentPlan: any[] = [];
    const startDate = new Date();

    for (let i = 1; i <= termInMonths; i++) {
      const interest = remainingBalance * monthlyRate;
      const principal = monthlyPayment - interest;
      remainingBalance -= principal;

      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      paymentPlan.push({
        paymentNumber: i,
        paymentDate: paymentDate.toISOString(),
        paymentAmount: monthlyPayment,
        interest,
        principal,
        remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
        status: "pending" as const,
      });
    }

    const planId = `${clientId}_${Date.now()}`;
    const payload = {
      clientId,
      creditAmount,
      interestRate,
      termInMonths,
      monthlyPayment,
      paymentPlan,
      createdAt: nowIso(),
      status: "active",
    };

    const { error: insertError } = await supabase.from(PAYMENT_PLANS_TABLE).insert(payload);
    if (insertError) {
      throw insertError;
    }

    return { success: true, paymentPlanId: planId, paymentPlan };
  } catch (error) {
    log.error("Error generating payment plan", error);
    throw error;
  }
}

export async function generateContract(
  clientId: string,
  clientName: string,
  clientAddress: string,
  clientPhone: string,
  creditLimit: number,
  interestRate: number,
  paymentDueDate: Date
) {
  try {
    const supabase = getSupabaseServerClient();
    const { getContractTemplate } = await import("./settingsService");
    const template = await getContractTemplate();

    let content = template.content;
    const replacements = {
      "{{CLIENT_NAME}}": clientName,
      "{{CLIENT_ADDRESS}}": clientAddress,
      "{{CLIENT_PHONE}}": clientPhone,
      "{{CREDIT_LIMIT}}": `$${creditLimit.toFixed(2)} MXN`,
      "{{INTEREST_RATE}}": `${interestRate || 0}%`,
      "{{PAYMENT_DUE_DAY}}": paymentDueDate.getDate().toString(),
      "{{STORE_NAME}}": "Storefront Swift",
      "{{STORE_ADDRESS}}": "Dirección de la Tienda",
      "{{STORE_CITY}}": "Tu Ciudad",
      "{{CURRENT_DATE}}": new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    } as Record<string, string>;

    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(key, "g"), value);
    }

    const contractId = `${clientId}_${Date.now()}`;
    const payload = {
      clientId,
      clientName,
      content,
      createdAt: nowIso(),
      status: "active",
      creditLimit,
      interestRate,
    };

    const { error: insertError } = await supabase.from(CONTRACTS_TABLE).insert(payload);
    if (insertError) {
      throw insertError;
    }

    return { success: true, contractId, content };
  } catch (error) {
    log.error("Error generating contract", error);
    throw error;
  }
}

export const deleteExpense = async (expenseId: string): Promise<void> => {
  const supabase = getSupabaseServerClient();

  // 1. Get the expense to know the amount, account, and session
  let query = supabase
    .from(EXPENSES_TABLE)
    .select("*");

  if (uuidValidate(expenseId)) {
    query = query.eq("id", expenseId);
  } else {
    // If expenseId is not UUID, try finding by ID assuming it might be stored that way, or fail
    query = query.eq("id", expenseId);
  }

  const { data: expense, error: fetchError } = await query.maybeSingle();

  if (fetchError || !expense) {
    throw new Error("No se encontró el gasto a eliminar.");
  }

  // 2. Reverse Account Balance (Add amount back)
  let accountQuery = supabase
    .from(ACCOUNTS_TABLE)
    .select("id, current_balance");

  if (expense.paidFromAccountId) {
    accountQuery = accountQuery.eq("id", expense.paidFromAccountId);
  }

  const { data: account, error: accountError } = await accountQuery.maybeSingle();

  if (account) {
    const newBalance = Number(account.current_balance ?? 0) + Number(expense.amount);
    const { error: updateError } = await supabase
      .from(ACCOUNTS_TABLE)
      .update({ current_balance: newBalance })
      .eq("id", account.id);

    if (updateError) {
      log.error("Failed to reverse account balance", updateError);
    }
  } else {
    log.warn("Account not found when deleting expense, balance not reversed.", { expenseId, accountId: expense.paidFromAccountId });
  }

  // 3. Reverse Session Totals (if linked)
  if (expense.sessionId) {
    let sessionQuery = supabase
      .from(CASH_SESSIONS_TABLE)
      .select("id, totalCashPayouts, expectedCashInDrawer, sessionId");

    sessionQuery = sessionQuery.eq("sessionId", expense.sessionId);

    const { data: session, error: sessionError } = await sessionQuery.maybeSingle();

    if (session) {
      const newTotalPayouts = Number(session.totalCashPayouts ?? 0) - Number(expense.amount);
      const newExpectedCash = Number(session.expectedCashInDrawer ?? 0) + Number(expense.amount);

      const { error: updateSessionError } = await supabase
        .from(CASH_SESSIONS_TABLE)
        .update({
          totalCashPayouts: newTotalPayouts,
          expectedCashInDrawer: newExpectedCash
        })
        .eq("sessionId", session.sessionId);

      if (updateSessionError) {
        log.error("Failed to reverse session totals", updateSessionError);
      }
    }
  }

  // 4. Delete the expense record
  const { error: deleteError } = await supabase
    .from(EXPENSES_TABLE)
    .delete()
    .eq("id", expense.id);

  if (deleteError) {
    throw new Error(`No se pudo eliminar el gasto: ${deleteError.message}`);
  }
};

export const depositSaleToAccount = async (
  amount: number,
  paymentMethod: string,
  saleId: string
): Promise<void> => {
  // Only process cash sales
  if (paymentMethod !== 'Efectivo') {
    return;
  }

  try {
    const supabase = getSupabaseServerClient();

    // 1. Find the "Caja Chica" account (or similar)
    // We'll look for an account named "Caja Chica" first, then any "Efectivo" type account
    let { data: account, error: accountError } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("*")
      .ilike("name", "%Caja Chica%")
      .maybeSingle();

    if (!account) {
      // Fallback: Find first 'Efectivo' account
      const { data: cashAccount, error: cashError } = await supabase
        .from(ACCOUNTS_TABLE)
        .select("*")
        .eq("type", "Efectivo")
        .limit(1)
        .maybeSingle();

      if (cashAccount) {
        account = cashAccount;
      }
    }

    if (!account) {
      log.warn("No 'Caja Chica' or 'Efectivo' account found. Cannot deposit cash sale.");
      return;
    }

    log.info(`Depositing sale ${saleId} ($${amount}) to account: ${account.name} (${account.id})`);

    // 2. Update the account balance
    const newBalance = Number(account.current_balance ?? 0) + amount;

    const { error: updateError } = await supabase
      .from(ACCOUNTS_TABLE)
      .update({ current_balance: newBalance })
      .eq("id", account.id);

    if (updateError) {
      log.error("Error updating account balance for cash deposit", updateError);
      throw new Error("Error al depositar venta en Caja Chica.");
    }

    log.info(`Deposit successful. New balance for ${account.name}: ${newBalance}`);

  } catch (error) {
    log.error("Error in depositSaleToAccount", error);
    // We don't throw here to avoid failing the entire sale process, but we log it.
  }
};

export interface AccountTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  referenceId?: string;
}

export const getAccountTransactions = async (accountId: string): Promise<AccountTransaction[]> => {
  try {
    const supabase = getSupabaseServerClient();

    // 0. Resolve Account IDs (UUID and Firestore ID) to ensure we catch all linked records
    const idsToCheck = [accountId];

    // 1. Fetch Expenses (paidFromAccountId)
    const { data: expenses, error: expenseError } = await supabase
      .from(EXPENSES_TABLE)
      .select("*")
      .in("paidFromAccountId", idsToCheck)
      .order("paymentDate", { ascending: false });

    if (expenseError) throw expenseError;

    // 2. Fetch Incomes (destinationAccountId)
    const { data: incomes, error: incomeError } = await supabase
      .from("incomes")
      .select("*")
      .in("destinationAccountId", idsToCheck)
      .order("paymentDate", { ascending: false });

    if (incomeError) throw incomeError;

    // 3. Map to common structure
    const expenseTransactions: AccountTransaction[] = (expenses || []).map((e: any) => ({
      id: e.id,
      date: toDate(e.paymentDate),
      description: e.description,
      amount: Number(e.amount),
      type: 'expense',
      category: e.category,
      referenceId: e.expenseId
    }));

    const incomeTransactions: AccountTransaction[] = (incomes || []).map((i: any) => ({
      id: i.id,
      date: toDate(i.paymentDate),
      description: i.description,
      amount: Number(i.amount),
      type: 'income',
      category: i.category,
      referenceId: i.incomeId
    }));

    // 4. Merge and Sort
    return [...expenseTransactions, ...incomeTransactions].sort((a, b) =>
      b.date.getTime() - a.date.getTime()
    );

  } catch (error) {
    log.error("Error fetching account transactions", error);
    return [];
  }
};
