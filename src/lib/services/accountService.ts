"use server";

import { v4 as uuidv4 } from "uuid";
import { Account } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("accountService");

const ACCOUNTS_TABLE = "accounts";

const mapAccount = (row: any): Account => ({
  id: row?.id ?? "",
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
    const supabase = getSupabaseServerClient();
    const payload = {
      name: accountData.name,
      type: accountData.type,
      current_balance: accountData.currentBalance ?? 0,
    };

    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("No se pudo crear la cuenta.");
    }

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

    // Transform camelCase to snake_case
    const payload: any = {};
    if (dataToUpdate.name !== undefined) payload.name = dataToUpdate.name;
    if (dataToUpdate.type !== undefined) payload.type = dataToUpdate.type;
    if (dataToUpdate.currentBalance !== undefined) payload.current_balance = dataToUpdate.currentBalance;

    const { error } = await supabase
      .from(ACCOUNTS_TABLE)
      .update(payload)
      .eq('id', accountId);

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
      .eq('id', accountId);

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error deleting account", error);
    throw error;
  }
};
