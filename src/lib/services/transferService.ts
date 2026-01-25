"use server";

import { v4 as uuidv4, validate as uuidValidate } from "uuid";
import { Transfer } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";
import { nowIso, toDate } from "@/lib/supabase/utils";

const log = getLogger("transferService");

const TRANSFERS_TABLE = "transfers";
const ACCOUNTS_TABLE = "accounts";

const mapTransfer = (row: any): Transfer => ({
    id: row?.id ?? "",
    transferId: row?.transferId ?? "",
    sourceAccountId: row?.sourceAccountId ?? "",
    destinationAccountId: row?.destinationAccountId ?? "",
    amount: Number(row?.amount ?? 0),
    description: row?.description ?? "",
    transferDate: toDate(row?.transferDate),
    reference: row?.reference ?? undefined,
});

export const getTransfers = async (): Promise<Transfer[]> => {
    try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from(TRANSFERS_TABLE)
            .select("*")
            .order("transferDate", { ascending: false });

        if (error) {
            throw error;
        }

        return (data ?? []).map(mapTransfer);
    } catch (error) {
        log.error("Error fetching transfers", error);
        return [];
    }
};

export const addTransfer = async (
    transferData: Omit<Transfer, "id" | "transferId" | "transferDate">
): Promise<Transfer> => {
    if (transferData.sourceAccountId === transferData.destinationAccountId) {
        throw new Error("La cuenta de origen y destino no pueden ser la misma.");
    }

    const supabase = getSupabaseServerClient();
    const transferId = `TRF-${uuidv4().split("-")[0].toUpperCase()}`;
    const transferDate = nowIso();

    // 1. Validate Source Account and Check Balance
    let sourceQuery = supabase
        .from(ACCOUNTS_TABLE)
        .select("id, current_balance, name")
        .eq("id", transferData.sourceAccountId);

    const { data: sourceAccount, error: sourceError } = await sourceQuery.maybeSingle();

    if (sourceError || !sourceAccount) {
        throw new Error("No se encontró la cuenta de origen.");
    }

    if (Number(sourceAccount.current_balance) < transferData.amount) {
        throw new Error(`Saldo insuficiente en la cuenta de origen (${sourceAccount.name}).`);
    }

    // 2. Validate Destination Account
    let destQuery = supabase
        .from(ACCOUNTS_TABLE)
        .select("id, current_balance, name")
        .eq("id", transferData.destinationAccountId);

    const { data: destAccount, error: destError } = await destQuery.maybeSingle();

    if (destError || !destAccount) {
        throw new Error("No se encontró la cuenta de destino.");
    }

    // 3. Insert Transfer Record
    const transferPayload = {
        transferId,
        sourceAccountId: transferData.sourceAccountId,
        destinationAccountId: transferData.destinationAccountId,
        amount: transferData.amount,
        description: transferData.description,
        transferDate,
        reference: transferData.reference,
    };

    const { data: insertedTransfer, error: insertError } = await supabase
        .from(TRANSFERS_TABLE)
        .insert(transferPayload)
        .select("*")
        .single();

    if (insertError) {
        log.error("Error inserting transfer", insertError);
        throw new Error(`No se pudo registrar la transferencia: ${insertError.message}`);
    }

    // 4. Update Source Account Balance (Subtract)
    const newSourceBalance = Number(sourceAccount.current_balance) - transferData.amount;
    const { error: updateSourceError } = await supabase
        .from(ACCOUNTS_TABLE)
        .update({ current_balance: newSourceBalance })
        .eq("id", sourceAccount.id);

    // 5. Update Destination Account Balance (Add)
    const newDestBalance = Number(destAccount.current_balance) + transferData.amount;
    const { error: updateDestError } = await supabase
        .from(ACCOUNTS_TABLE)
        .update({ current_balance: newDestBalance })
        .eq("id", destAccount.id);

    return mapTransfer(insertedTransfer);
};

export const deleteTransfer = async (transferId: string): Promise<void> => {
    const supabase = getSupabaseServerClient();

    // 1. Get the transfer to know the amount and accounts
    let query = supabase
        .from(TRANSFERS_TABLE)
        .select("*")
        .eq("id", transferId);

    const { data: transfer, error: fetchError } = await query.maybeSingle();

    if (fetchError || !transfer) {
        throw new Error("No se encontró la transferencia a eliminar.");
    }

    // 2. Reverse Source Account Balance (Add amount back)
    let sourceQuery = supabase
        .from(ACCOUNTS_TABLE)
        .select("id, current_balance")
        .eq("id", transfer.sourceAccountId);

    const { data: sourceAccount, error: sourceError } = await sourceQuery.maybeSingle();

    if (sourceAccount) {
        const newSourceBalance = Number(sourceAccount.current_balance ?? 0) + Number(transfer.amount);
        const { error: updateSourceError } = await supabase
            .from(ACCOUNTS_TABLE)
            .update({ current_balance: newSourceBalance })
            .eq("id", sourceAccount.id);
    } else {
        log.warn("Source account not found when deleting transfer, balance not reversed.", { transferId, accountId: transfer.sourceAccountId });
    }

    // 3. Reverse Destination Account Balance (Subtract amount)
    let destQuery = supabase
        .from(ACCOUNTS_TABLE)
        .select("id, current_balance")
        .eq("id", transfer.destinationAccountId);

    const { data: destAccount, error: destError } = await destQuery.maybeSingle();

    if (destAccount) {
        const newDestBalance = Number(destAccount.current_balance ?? 0) - Number(transfer.amount);
        const { error: updateDestError } = await supabase
            .from(ACCOUNTS_TABLE)
            .update({ current_balance: newDestBalance })
            .eq("id", destAccount.id);
    } else {
        log.warn("Destination account not found when deleting transfer, balance not reversed.", { transferId, accountId: transfer.destinationAccountId });
    }

    // 4. Delete the transfer record
    const { error: deleteError } = await supabase
        .from(TRANSFERS_TABLE)
        .delete()
        .eq("id", transfer.id);

    if (deleteError) {
        throw new Error(`No se pudo eliminar la transferencia: ${deleteError.message}`);
    }
};
