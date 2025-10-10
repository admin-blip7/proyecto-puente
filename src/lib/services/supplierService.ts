"use server";

import { v4 as uuidv4 } from "uuid";
import { Supplier } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("supplierService");

const SUPPLIERS_TABLE = "suppliers";

const mapSupplier = (row: any): Supplier => ({
  id: row?.firestore_id ?? row?.id ?? "",
  name: row?.name ?? "",
  contactInfo: row?.contactInfo ?? "",
  notes: row?.notes ?? "",
  totalPurchasedYTD: Number(row?.totalPurchasedYTD ?? 0),
  createdAt: toDate(row?.createdAt),
  updatedAt: toDate(row?.updatedAt),
});

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

export async function addSupplier(
  supplierData: Omit<Supplier, "id" | "createdAt" | "updatedAt" | "totalPurchasedYTD">
): Promise<string> {
  try {
    const supabase = getSupabaseServerClient();
    const firestoreId = uuidv4();
    const timestamp = nowIso();

    const payload = {
      firestore_id: firestoreId,
      name: supplierData.name,
      contactInfo: supplierData.contactInfo,
      notes: supplierData.notes ?? "",
      totalPurchasedYTD: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { error } = await supabase.from(SUPPLIERS_TABLE).insert(payload);
    if (error) {
      throw error;
    }

    return firestoreId;
  } catch (error) {
    log.error("Error adding supplier", error);
    throw error;
  }
}

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(SUPPLIERS_TABLE)
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapSupplier);
  } catch (error) {
    log.error("Error getting suppliers", error);
    throw error;
  }
}

export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(SUPPLIERS_TABLE)
      .select("*")
      .or(orIdFilter(supplierId))
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapSupplier(data) : null;
  } catch (error) {
    log.error("Error getting supplier", error);
    throw error;
  }
}

export async function updateSupplier(
  supplierId: string,
  updates: Partial<Omit<Supplier, "id" | "createdAt">>
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const sanitized: Record<string, any> = {
      ...updates,
      updatedAt: nowIso(),
    };

    const { error } = await supabase
      .from(SUPPLIERS_TABLE)
      .update(sanitized)
      .or(orIdFilter(supplierId));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating supplier", error);
    throw error;
  }
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(SUPPLIERS_TABLE)
      .delete()
      .or(orIdFilter(supplierId));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error deleting supplier", error);
    throw error;
  }
}

export async function updateSupplierPurchaseTotal(
  supplierId: string,
  purchaseAmount: number
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(SUPPLIERS_TABLE)
      .select("firestore_id,totalPurchasedYTD")
      .or(orIdFilter(supplierId))
      .maybeSingle();

    if (error || !data) {
      throw error ?? new Error("Supplier not found");
    }

    const newTotal = Number(data.totalPurchasedYTD ?? 0) + purchaseAmount;
    const { error: updateError } = await supabase
      .from(SUPPLIERS_TABLE)
      .update({ totalPurchasedYTD: newTotal, updatedAt: nowIso() })
      .eq("firestore_id", data.firestore_id ?? supplierId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    log.error("Error updating supplier purchase total", error);
    throw error;
  }
}

export async function searchSuppliers(searchTerm: string): Promise<Supplier[]> {
  try {
    const normalized = searchTerm?.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(SUPPLIERS_TABLE)
      .select("*")
      .or(
        `name.ilike.%${normalized}%,contactInfo.ilike.%${normalized}%`
      )
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapSupplier);
  } catch (error) {
    log.error("Error searching suppliers", error);
    throw error;
  }
}