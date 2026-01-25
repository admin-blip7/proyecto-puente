"use server";

import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import { Income, IncomeCategory } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";
import { uploadFile } from "./documentService";
import { nowIso, toDate } from "@/lib/supabase/utils";

const log = getLogger("incomeService");

const INCOMES_TABLE = "incomes";
const INCOME_CATEGORIES_TABLE = "income_categories";
const ACCOUNTS_TABLE = "accounts";
const CASH_SESSIONS_TABLE = "cash_sessions";
const STORAGE_RECEIPTS_PATH = "income_receipts";

const mapIncome = (row: any): Income => {
    return {
        id: String(row?.id),
        incomeId: row?.incomeId ?? "",
        description: row?.description ?? "",
        category: row?.category ?? "",
        amount: Number(row?.amount ?? 0),
        destinationAccountId: row?.destinationAccountId ?? "",
        source: row?.source ?? "",
        paymentDate: toDate(row?.paymentDate),
        receiptUrl: row?.receiptUrl ?? undefined,
        sessionId: row?.sessionId ?? undefined,
        icon: row?.icon ?? "",
    };
};

const mapCategory = (row: any): IncomeCategory => ({
    id: row?.id ?? "",
    name: row?.name ?? "",
    isActive: Boolean(row?.isActive ?? false),
    icon: row?.icon ?? "",
});

export const getIncomes = async (startDate?: Date, endDate?: Date): Promise<Income[]> => {
    try {
        const supabase = getSupabaseServerClient();

        // 1. Fetch Incomes
        let incomeQuery = supabase
            .from(INCOMES_TABLE)
            .select("*")
            .order("paymentDate", { ascending: false });

        if (startDate && endDate) {
            incomeQuery = incomeQuery
                .gte("paymentDate", startDate.toISOString())
                .lte("paymentDate", endDate.toISOString());
        }

        const { data: incomesData, error: incomesError } = await incomeQuery;

        if (incomesError) {
            throw incomesError;
        }

        const incomes = (incomesData ?? []).map(mapIncome);

        // 2. Fetch Sales - REMOVED per user request. 
        // User wants to see only "Corte de Caja" (Deposits) in Income tab, not individual sales.
        const sales: Income[] = [];

        // 3. Merge and Sort
        const allIncome = [...incomes, ...sales].sort((a, b) =>
            b.paymentDate.getTime() - a.paymentDate.getTime()
        );

        return allIncome;
    } catch (error) {
        log.error("Error fetching incomes", error);
        return [];
    }
};

export const getIncomeCategories = async (): Promise<IncomeCategory[]> => {
    try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from(INCOME_CATEGORIES_TABLE)
            .select("*")
            .eq("isActive", true)
            .order("name", { ascending: true });

        if (error) {
            throw error;
        }

        const categories = (data ?? []).map(mapCategory);
        // Deduplicate by name
        const uniqueCategories = categories.filter(
            (category, index, self) =>
                index === self.findIndex((c) => c.name === category.name)
        );

        return uniqueCategories;
    } catch (error) {
        log.error("Error fetching income categories", error);
        return [];
    }
};

export const addIncomeCategory = async (
    categoryData: Omit<IncomeCategory, "id">
): Promise<IncomeCategory> => {
    try {
        const supabase = getSupabaseServerClient();

        const payload = {
            name: categoryData.name,
            isActive: categoryData.isActive ?? true,
            icon: categoryData.icon ?? null,
        };

        const { data, error } = await supabase
            .from(INCOME_CATEGORIES_TABLE)
            .insert(payload)
            .select("*")
            .single();

        if (error || !data) {
            throw error ?? new Error("No se pudo crear la categoría de ingreso.");
        }

        return mapCategory(data);
    } catch (error) {
        log.error("Error adding income category", error);
        throw error;
    }
};

const uploadReceipt = async (file: File, incomeId: string): Promise<string> => {
    const sanitizeFilename = (filename: string): string => {
        return filename
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    };

    const sanitizedFilename = sanitizeFilename(file.name);
    const filePath = `${STORAGE_RECEIPTS_PATH}/${incomeId}-${sanitizedFilename}`;
    return uploadFile(file, filePath);
};

export const addIncome = async (
    incomeData: Omit<Income, "id" | "incomeId" | "paymentDate" | "receiptUrl">,
    receiptFile?: File,
    userId?: string
): Promise<Income> => {
    if (!incomeData.destinationAccountId) {
        throw new Error("La cuenta de destino es requerida.");
    }

    const supabase = getSupabaseServerClient();
    const incomeId = `INC-${uuidv4().split("-")[0].toUpperCase()}`;
    const paymentDate = nowIso();

    let receiptUrl: string | undefined;
    if (receiptFile) {
        receiptUrl = await uploadReceipt(receiptFile, incomeId);
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

    const incomePayload = {
        incomeId,
        description: incomeData.description,
        category: incomeData.category,
        amount: incomeData.amount,
        destinationAccountId: incomeData.destinationAccountId,
        source: incomeData.source,
        paymentDate,
        receiptUrl: receiptUrl ?? null,
        sessionId: activeSession ? activeSession.id : (incomeData.sessionId || null),
        icon: incomeData.icon ?? null,
    };

    const { data: insertedIncome, error: insertError } = await supabase
        .from(INCOMES_TABLE)
        .insert(incomePayload)
        .select("*")
        .single();

    if (insertError) {
        log.error("Error inserting income", insertError);
        throw new Error(`No se pudo registrar el ingreso: ${insertError.message}`);
    }

    // Update Account Balance
    // Find account
    console.log("Looking for account with ID:", incomeData.destinationAccountId);

    let query = supabase
        .from(ACCOUNTS_TABLE)
        .select("id, current_balance, name");

    query = query.eq("id", incomeData.destinationAccountId);

    const { data: account, error: accountError } = await query.maybeSingle();

    console.log("Account lookup result:", { account, accountError });

    if (accountError || !account) {
        log.error("Error fetching account for income", accountError);
        // Note: Income is recorded but balance not updated. This is a partial failure state.
        // Ideally we would use a transaction, but Supabase JS client doesn't support transactions across multiple requests easily without RPC.
        // For now we log and throw, but the income record exists.
        throw new Error(`Ingreso registrado, pero no se encontró la cuenta para actualizar el saldo. ID buscado: ${incomeData.destinationAccountId}`);
    }

    const newBalance = Number(account.current_balance ?? 0) + incomeData.amount;

    console.log(`[addIncome] Updating account balance: ${account.name} (DB ID: ${account.id}), old: ${account.current_balance}, amount: ${incomeData.amount}, new: ${newBalance}`);

    // Always use the database id for reliable updates
    // This ensures the update works consistently
    const { error: updateError } = await supabase
        .from(ACCOUNTS_TABLE)
        .update({ current_balance: newBalance })
        .eq("id", account.id);

    if (updateError) {
        log.error("Error updating account balance for income", updateError);
        // ROLLBACK: Delete the inserted income since we can't update balance
        await supabase.from(INCOMES_TABLE).delete().eq("id", insertedIncome.id);
        throw new Error(`Ingreso registrado, pero falló la actualización del saldo: ${updateError.message}`);
    }

    return mapIncome(insertedIncome);
};

export const deleteIncome = async (incomeId: string): Promise<void> => {
    const supabase = getSupabaseServerClient();

    // 1. Get the income to know the amount and account
    let query = supabase
        .from(INCOMES_TABLE)
        .select("*");

    query = query.eq("id", incomeId);

    const { data: income, error: fetchError } = await query.maybeSingle();

    if (fetchError || !income) {
        throw new Error("No se encontró el ingreso a eliminar.");
    }

    // 2. Get the account to reverse the balance
    let accountQuery = supabase
        .from(ACCOUNTS_TABLE)
        .select("id, current_balance, name");

    if (uuidValidate(income.destinationAccountId)) {
        accountQuery = accountQuery.eq("id", income.destinationAccountId);
    } else {
        // If it's not a UUID, it might be an old integer ID or similar, but for now we assume ID
        accountQuery = accountQuery.eq("id", income.destinationAccountId);
    }

    const { data: account, error: accountError } = await accountQuery.maybeSingle();

    if (account) {
        // Reverse balance (Subtract income amount)
        const newBalance = Number(account.current_balance ?? 0) - Number(income.amount);
        console.log(`[deleteIncome] Reversing account balance for ${account.name} (DB ID: ${account.id}), old: ${account.current_balance}, amount: -${income.amount}, new: ${newBalance}`);

        // Always use the database id for reliable updates
        const { error: updateError } = await supabase
            .from(ACCOUNTS_TABLE)
            .update({ current_balance: newBalance })
            .eq("id", account.id);

        if (updateError) {
            log.error("Error reversing account balance when deleting income", updateError);
            // Continue with delete even if balance update fails (partial failure)
        }
    } else {
        log.warn("Account not found when deleting income, balance not reversed.", { incomeId, accountId: income.destinationAccountId });
    }

    // 3. Delete the income record
    // Try delete by ID first
    const { error: deleteError } = await supabase
        .from(INCOMES_TABLE)
        .delete()
        .eq("id", income.id);

    if (deleteError) {
        throw new Error(`No se pudo eliminar el ingreso: ${deleteError.message}`);
    }
};

export const getIncomesBySession = async (
    sessionId: string,
    startDate?: Date,
    endDate?: Date
): Promise<Income[]> => {
    try {
        const supabase = getSupabaseServerClient();

        // Try to fetch by sessionId first if the column exists (it should after migration)
        const { data, error } = await supabase
            .from(INCOMES_TABLE)
            .select("*")
            .eq("sessionId", sessionId)
            .order("paymentDate", { ascending: false });

        if (!error && data && data.length > 0) {
            return data.map(mapIncome);
        }

        // Fallback to date range if sessionId lookup returns nothing (or column missing/old records)
        if (startDate && endDate) {
            const { data: dateData, error: dateError } = await supabase
                .from(INCOMES_TABLE)
                .select("*")
                .gte("paymentDate", startDate.toISOString())
                .lte("paymentDate", endDate.toISOString())
                .order("paymentDate", { ascending: false });

            if (dateError) throw dateError;

            return (dateData ?? []).map(mapIncome);
        }

        return [];
    } catch (error) {
        log.error("Error fetching incomes by session", error);
        return [];
    }
};
