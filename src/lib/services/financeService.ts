"use server";

import { Expense } from "@/types";
import { v4 as uuidv4 } from "uuid";
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

const mapExpense = (row: any): Expense => ({
  id: row?.firestore_id ?? row?.id ?? "",
  expenseId: row?.expenseId ?? "",
  description: row?.description ?? "",
  category: row?.category ?? "",
  amount: Number(row?.amount ?? 0),
  paidFromAccountId: row?.paidFromAccountId ?? "",
  paymentDate: toDate(row?.paymentDate),
  receiptUrl: row?.receiptUrl ?? undefined,
  sessionId: row?.sessionId ?? undefined,
});

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

  const supabase = getSupabaseServerClient();
  const expenseId = `EXP-${uuidv4().split("-")[0].toUpperCase()}`;
  const firestoreId = uuidv4();
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
    firestore_id: firestoreId,
    expenseId,
    description: expenseData.description,
    category: expenseData.category,
    amount: expenseData.amount,
    paidFromAccountId: expenseData.paidFromAccountId,
    paymentDate,
    receiptUrl: receiptUrl ?? null,
    sessionId: activeSession ? (activeSession.firestore_id || activeSession.id) : (expenseData.sessionId || null),
  };

  const { data: insertedExpense, error: insertError } = await supabase
    .from(EXPENSES_TABLE)
    .insert(expensePayload)
    .select("*")
    .single();

  if (insertError) {
    log.error("Error inserting expense", { 
      insertError, 
      errorDetails: {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      },
      expensePayload: {
        ...expensePayload,
        // Don't log sensitive data but log the structure
        hasValidAccountId: !!expensePayload.paidFromAccountId,
        accountId: expensePayload.paidFromAccountId
      }
    });
    throw new Error(`No se pudo registrar el gasto: ${insertError.message}`);
  }

  // First, try to find the account using both possible ID fields
  let accountRow = null;
  let accountError = null;

  // Try firestore_id first
  const { data: byFirestoreId, error: errorFirestore } = await supabase
    .from(ACCOUNTS_TABLE)
    .select("firestore_id,currentBalance")
    .eq("firestore_id", expenseData.paidFromAccountId)
    .maybeSingle();
  
  if (!errorFirestore && byFirestoreId) {
    accountRow = byFirestoreId;
  } else {
    // If not found by firestore_id, try with id field
    const { data: byId, error: errorId } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("firestore_id,currentBalance")
      .eq("id", expenseData.paidFromAccountId)
      .maybeSingle();
    
    if (byId) {
      accountRow = byId;
      accountError = null;
    } else {
      accountError = errorId || errorFirestore;
    }
  }

  if (accountError || !accountRow) {
    log.error("Error fetching account", { 
      accountError, 
      accountId: expenseData.paidFromAccountId,
      errorDetails: accountError,
      searchAttempts: {
        firestore_id: expenseData.paidFromAccountId,
        id: expenseData.paidFromAccountId
      }
    });
    throw new Error(`No se encontró la cuenta seleccionada. ID: ${expenseData.paidFromAccountId}`);
  }

  const newBalance = Number(accountRow.currentBalance ?? 0) - expenseData.amount;
  // Update account balance with more specific ID matching
  let accountUpdateError = null;
  // First try updating with firestore_id
  const { error: errorByFirestoreId } = await supabase
    .from(ACCOUNTS_TABLE)
    .update({ current_balance: newBalance })
    .eq("firestore_id", accountRow.firestore_id);
  
  if (errorByFirestoreId) {
    // If that fails, try with id field
    const { error: errorById } = await supabase
      .from(ACCOUNTS_TABLE)
      .update({ current_balance: newBalance })
      .eq("id", expenseData.paidFromAccountId);
    accountUpdateError = errorById;
  }

  if (accountUpdateError) {
    log.warn("Failed to update account balance", accountUpdateError);
  }

  if (activeSession) {
    const newTotalPayouts = Number(activeSession.totalCashPayouts ?? 0) + expenseData.amount;
    const expectedCashInDrawer =
      Number(activeSession.startingFloat ?? 0) + Number(activeSession.totalCashSales ?? 0) - newTotalPayouts;

    // Update the session with more specific ID matching
    let sessionUpdateError = null;
    // First try updating with firestore_id
    const { error: sessionErrorByFirestoreId } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .update({
        totalCashPayouts: newTotalPayouts,
        expectedCashInDrawer,
      })
      .eq("firestore_id", activeSession.firestore_id || activeSession.id);
    
    if (sessionErrorByFirestoreId) {
      // If that fails, try with id field
      const { error: sessionErrorById } = await supabase
        .from(CASH_SESSIONS_TABLE)
        .update({
          totalCashPayouts: newTotalPayouts,
          expectedCashInDrawer,
        })
        .eq("id", activeSession.firestore_id || activeSession.id);
      sessionUpdateError = sessionErrorById;
    }

    if (sessionUpdateError) {
      log.warn("Failed to update cash session with expense", sessionUpdateError);
    }
  }

  if (accountUpdateError) {
    log.warn("Failed to update account balance", accountUpdateError);
  }

  return mapExpense(insertedExpense);
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
      firestore_id: uuidv4(),
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
    .eq("firestore_id", existingRow.firestore_id ?? existingRow.id);

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
      firestore_id: planId,
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
      firestore_id: contractId,
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
