"use server";

import { v4 as uuidv4 } from "uuid";
import { Account } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("accountService");

const ACCOUNTS_TABLE = "accounts";

const mapAccount = (row: any): Account => ({
  id: row?.firestore_id ?? row?.id ?? "",
  name: row?.name ?? "",
  type: row?.type ?? "Banco",
  currentBalance: Number(row?.current_balance ?? 0),
});

export const getAccounts = async (): Promise<Account[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapAccount);
  } catch (error) {
    log.error("Error fetching accounts", error);
    throw error;
  }
};

export const addAccount = async (accountData: Omit<Account, "id">): Promise<Account> => {
  try {
    log.info("Attempting to add account", {
      name: accountData.name,
      type: accountData.type,
      currentBalance: accountData.currentBalance
    });

    const supabase = getSupabaseServerClient();
    const firestoreId = uuidv4();
    const payload = {
      firestore_id: firestoreId,
      name: accountData.name?.trim(),
      type: accountData.type || "Banco",
      current_balance: Number(accountData.currentBalance ?? 0),
    };

    log.debug("Inserting account payload", payload);

    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      log.error("Database error inserting account", {
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        },
        payload
      });
      throw new Error(`Error al crear cuenta: ${error.message}`);
    }

    if (!data) {
      log.error("No data returned after insert");
      throw new Error("No se pudo crear la cuenta - no se recibieron datos.");
    }

    log.info("Account created successfully", { accountId: data.firestore_id || data.id });
    return mapAccount(data);
  } catch (error) {
    log.error("Error adding account", error);
    throw error;
  }
};

export const updateAccount = async (
  accountId: string,
  dataToUpdate: Partial<Omit<Account, "id">>
): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();

    // Convert camelCase to snake_case for database fields
    const dbDataToUpdate: any = {};
    if (dataToUpdate.name !== undefined) dbDataToUpdate.name = dataToUpdate.name;
    if (dataToUpdate.type !== undefined) dbDataToUpdate.type = dataToUpdate.type;
    if (dataToUpdate.currentBalance !== undefined) dbDataToUpdate.current_balance = dataToUpdate.currentBalance;

    const { error } = await supabase
      .from(ACCOUNTS_TABLE)
      .update(dbDataToUpdate)
      .or(`firestore_id.eq.${accountId},id.eq.${accountId}`);

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating account", error);
    throw error;
  }
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(ACCOUNTS_TABLE)
      .delete()
      .or(`firestore_id.eq.${accountId},id.eq.${accountId}`);

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error deleting account", error);
    throw error;
  }
};
