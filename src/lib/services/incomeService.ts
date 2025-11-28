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

const mapIncome = (row: any): Income => ({
    id: row?.firestore_id ?? row?.id ?? "",
    incomeId: row?.incomeId ?? "",
    description: row?.description ?? "",
    category: row?.category ?? "",
    amount: Number(row?.amount ?? 0),
    destinationAccountId: row?.destinationAccountId ?? "",
    source: row?.source ?? "",
    paymentDate: toDate(row?.paymentDate),
    receiptUrl: row?.receiptUrl ?? undefined,
    sessionId: row?.sessionId ?? undefined,
});

const mapCategory = (row: any): IncomeCategory => ({
    id: row?.firestore_id ?? row?.id ?? "",
    name: row?.name ?? "",
    isActive: Boolean(row?.isActive ?? false),
});

export const getIncomes = async (): Promise<Income[]> => {
    try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from(INCOMES_TABLE)
            .select("*")
            .order("paymentDate", { ascending: false });

        if (error) {
            throw error;
        }

        return (data ?? []).map(mapIncome);
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
        const firestoreId = uuidv4();
        const payload = {
            firestore_id: firestoreId,
            name: categoryData.name,
            isActive: categoryData.isActive ?? true,
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
    const firestoreId = uuidv4();
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
        firestore_id: firestoreId,
        incomeId,
        description: incomeData.description,
        category: incomeData.category,
        amount: incomeData.amount,
        destinationAccountId: incomeData.destinationAccountId,
        source: incomeData.source,
        paymentDate,
        receiptUrl: receiptUrl ?? null,
        sessionId: activeSession ? (activeSession.firestore_id || activeSession.id) : (incomeData.sessionId || null),
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
        .select("firestore_id, id, current_balance");

    if (uuidValidate(incomeData.destinationAccountId)) {
        query = query.or(`firestore_id.eq.${incomeData.destinationAccountId},id.eq.${incomeData.destinationAccountId}`);
    } else {
        query = query.eq("firestore_id", incomeData.destinationAccountId);
    }

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

    const { error: updateError } = await supabase
        .from(ACCOUNTS_TABLE)
        .update({ current_balance: newBalance })
        .eq("firestore_id", account.firestore_id); // Use firestore_id for update if available, or id

    if (updateError) {
        // Fallback to ID if firestore_id update failed (though it shouldn't if we found it)
        const { error: updateError2 } = await supabase
            .from(ACCOUNTS_TABLE)
            .update({ current_balance: newBalance })
            .eq("id", account.id);

        if (updateError2) {
            log.error("Error updating account balance for income", updateError2);
            throw new Error("Ingreso registrado, pero falló la actualización del saldo.");
        }
    }

    return mapIncome(insertedIncome);
};

export const deleteIncome = async (incomeId: string): Promise<void> => {
    const supabase = getSupabaseServerClient();

    // 1. Get the income to know the amount and account
    let query = supabase
        .from(INCOMES_TABLE)
        .select("*");

    if (uuidValidate(incomeId)) {
        query = query.or(`firestore_id.eq.${incomeId},id.eq.${incomeId}`);
    } else {
        query = query.eq("firestore_id", incomeId);
    }

    const { data: income, error: fetchError } = await query.maybeSingle();

    if (fetchError || !income) {
        throw new Error("No se encontró el ingreso a eliminar.");
    }

    // 2. Get the account to reverse the balance
    let accountQuery = supabase
        .from(ACCOUNTS_TABLE)
        .select("firestore_id, id, current_balance");

    if (uuidValidate(income.destinationAccountId)) {
        accountQuery = accountQuery.or(`firestore_id.eq.${income.destinationAccountId},id.eq.${income.destinationAccountId}`);
    } else {
        accountQuery = accountQuery.eq("firestore_id", income.destinationAccountId);
    }

    const { data: account, error: accountError } = await accountQuery.maybeSingle();

    if (account) {
        // Reverse balance (Subtract income amount)
        const newBalance = Number(account.current_balance ?? 0) - Number(income.amount);

        const { error: updateError } = await supabase
            .from(ACCOUNTS_TABLE)
            .update({ current_balance: newBalance })
            .eq("firestore_id", account.firestore_id);

        if (updateError) {
            // Fallback to ID
            await supabase
                .from(ACCOUNTS_TABLE)
                .update({ current_balance: newBalance })
                .eq("id", account.id);
        }
    } else {
        log.warn("Account not found when deleting income, balance not reversed.", { incomeId, accountId: income.destinationAccountId });
    }

    // 3. Delete the income record
    const { error: deleteError } = await supabase
        .from(INCOMES_TABLE)
        .delete()
        .eq("firestore_id", income.firestore_id);

    if (deleteError) {
        // Try fallback to ID if firestore_id delete failed
        const { error: deleteError2 } = await supabase
            .from(INCOMES_TABLE)
            .delete()
            .eq("id", income.id);

        if (deleteError2) {
            throw new Error(`No se pudo eliminar el ingreso: ${deleteError2.message}`);
        }
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
