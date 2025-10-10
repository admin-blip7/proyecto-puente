"use server";

import { v4 as uuidv4 } from "uuid";
import { Debt } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("debtService");

const DEBTS_TABLE = "debts";

const mapDebt = (row: any): Debt => ({
  id: row?.firestore_id ?? row?.id ?? "",
  creditorName: row?.creditorName ?? "",
  debtType: row?.debtType ?? "Otro",
  currentBalance: Number(row?.currentBalance ?? 0),
  createdAt: toDate(row?.createdAt),
  totalLimit: row?.totalLimit !== null ? Number(row.totalLimit) : undefined,
  closingDate: row?.closingDate ?? undefined,
  paymentDueDate: row?.paymentDueDate ?? undefined,
  interestRate: row?.interestRate !== null ? Number(row.interestRate) : undefined,
  cat: row?.cat !== null ? Number(row.cat) : undefined,
});

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

export const getDebts = async (): Promise<Debt[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(DEBTS_TABLE)
      .select("*")
      .order("creditorName", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapDebt);
  } catch (error) {
    log.error("Error fetching debts", error);
    return [];
  }
};

export const addDebt = async (
  debtData: Omit<Debt, "id" | "createdAt">
): Promise<Debt> => {
  try {
    const supabase = getSupabaseServerClient();
    const firestoreId = uuidv4();
    const payload = {
      firestore_id: firestoreId,
      creditorName: debtData.creditorName,
      debtType: debtData.debtType,
      currentBalance: debtData.currentBalance,
      totalLimit: debtData.totalLimit ?? null,
      closingDate: debtData.closingDate ?? null,
      paymentDueDate: debtData.paymentDueDate ?? null,
      interestRate: debtData.interestRate ?? null,
      cat: debtData.cat ?? null,
      createdAt: nowIso(),
    };

    const { data, error } = await supabase
      .from(DEBTS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Failed to add debt");
    }

    return mapDebt(data);
  } catch (error) {
    log.error("Error adding debt", error);
    throw error;
  }
};

export const updateDebt = async (
  debtId: string,
  dataToUpdate: Partial<Omit<Debt, "id" | "createdAt">>
): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(DEBTS_TABLE)
      .update(dataToUpdate)
      .or(orIdFilter(debtId));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating debt", error);
    throw error;
  }
};

export const deleteDebt = async (debtId: string): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(DEBTS_TABLE)
      .delete()
      .or(orIdFilter(debtId));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error deleting debt", error);
    throw error;
  }
};
