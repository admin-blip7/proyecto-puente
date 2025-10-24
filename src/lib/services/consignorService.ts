"use server";

import { v4 as uuidv4 } from "uuid";
import { Consignor } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("consignorService");

const CONSIGNORS_TABLE = "consignors";

const mapConsignor = (row: any): Consignor => ({
  id: row?.id ?? "", // Use the UUID id from Supabase
  firestore_id: row?.firestore_id,
  name: row?.name ?? "",
  contactInfo: row?.contactInfo ?? "",
  balanceDue: Number(row?.balanceDue ?? 0),
});

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

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

    const mappedConsignors = (data ?? []).map(mapConsignor);
    
    // Remove duplicates by name and contactInfo to prevent duplicates in UI
    const uniqueConsignors = mappedConsignors.filter((consignor, index, self) => 
      index === self.findIndex(c => 
        c.name === consignor.name && c.contactInfo === consignor.contactInfo
      )
    );

    log.info(`Fetched ${data?.length || 0} consignors, filtered to ${uniqueConsignors.length} unique`);
    return uniqueConsignors;
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
    const firestoreId = uuidv4();
    const payload = {
      firestore_id: firestoreId,
      name: data.name,
      contactInfo: data.contactInfo,
      balanceDue: 0,
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
    const { error } = await supabase
      .from(CONSIGNORS_TABLE)
      .update(data)
      .or(orIdFilter(consignorId));

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
      .or(orIdFilter(consignorId));

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
      .select("firestore_id,balanceDue")
      .or(orIdFilter(consignorId))
      .maybeSingle();

    if (error || !data) {
      throw error ?? new Error("Consignor not found");
    }

    const newBalance = Number(data.balanceDue ?? 0) + amountToAdd;
    const { error: updateError } = await supabase
      .from(CONSIGNORS_TABLE)
      .update({ balanceDue: newBalance })
      .eq("firestore_id", data.firestore_id ?? consignorId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    log.error("Error updating consignor balance", error);
    throw error;
  }
};
