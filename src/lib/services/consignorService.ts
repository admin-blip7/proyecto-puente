"use server";

import { v4 as uuidv4 } from "uuid";
import { Consignor } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("consignorService");

const CONSIGNORS_TABLE = "consignors";

const mapConsignor = (row: any): Consignor => ({
  id: row?.id ?? "",
  name: row?.name ?? "",
  contactInfo: row?.contact_info ?? "",
  balanceDue: Number(row?.balance_due ?? 0),
});

export const getConsignors = async (): Promise<Consignor[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CONSIGNORS_TABLE)
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapConsignor);
  } catch (error) {
    log.error("Error fetching consignors", error);
    return [];
  }
};

export const addConsignor = async (
  data: Omit<Consignor, "id" | "balanceDue">
): Promise<Consignor> => {
  try {
    const supabase = getSupabaseServerClient();
    const payload = {
      name: data.name,
      contact_info: data.contactInfo,
      balance_due: 0,
    };

    const { data: inserted, error } = await supabase
      .from(CONSIGNORS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !inserted) {
      throw error ?? new Error("Failed to add consignor");
    }

    return mapConsignor(inserted);
  } catch (error) {
    log.error("Error adding consignor", error);
    throw new Error("Failed to add consignor.");
  }
};

export const updateConsignorInfo = async (
  consignorId: string,
  data: Partial<Omit<Consignor, "id" | "balanceDue">>
): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();

    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.contactInfo) payload.contact_info = data.contactInfo;

    const { error } = await supabase
      .from(CONSIGNORS_TABLE)
      .update(payload)
      .eq("id", consignorId);

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating consignor", error);
    throw new Error("Failed to update consignor.");
  }
};

export const deleteConsignor = async (consignorId: string): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(CONSIGNORS_TABLE)
      .delete()
      .eq("id", consignorId);

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error deleting consignor", error);
    throw new Error("Failed to delete consignor.");
  }
};

export const updateConsignorBalance = async (
  consignorId: string,
  amountToAdd: number
): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CONSIGNORS_TABLE)
      .select("id, balance_due")
      .eq("id", consignorId)
      .maybeSingle();

    if (error || !data) {
      throw error ?? new Error("Consignor not found");
    }

    const newBalance = Number(data.balance_due ?? 0) + amountToAdd;
    const { error: updateError } = await supabase
      .from(CONSIGNORS_TABLE)
      .update({ balance_due: newBalance, updated_at: nowIso() })
      .eq("id", data.id);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    log.error("Error updating consignor balance", error);
    throw error;
  }
};
