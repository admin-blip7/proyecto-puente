"use server";

import { v4 as uuidv4 } from "uuid";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("categoryService");

export interface Category {
  id: string;
  name: string;
  createdAt: Date;
}

const CATEGORIES_TABLE = "categories";

const mapCategory = (row: any): Category => ({
  id: row?.firestore_id ?? row?.id ?? "",
  name: row?.name ?? "",
  createdAt: toDate(row?.createdAt),
});

export async function searchCategories(searchTerm: string): Promise<Category[]> {
  try {
    const supabase = getSupabaseServerClient();
    const normalizedTerm = searchTerm?.trim();
    if (!normalizedTerm) {
      return [];
    }

    const { data, error } = await supabase
      .from(CATEGORIES_TABLE)
      .select("*")
      .ilike("name", `${normalizedTerm}%`)
      .order("name", { ascending: true })
      .limit(10);

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapCategory);
  } catch (error) {
    log.error("Error searching categories", error);
    return [];
  }
}

export async function createCategory(name: string): Promise<string> {
  try {
    if (!name?.trim()) {
      throw new Error("El nombre de la categoría es obligatorio.");
    }

    const supabase = getSupabaseServerClient();
    const firestoreId = uuidv4();
    const payload = {
      firestore_id: firestoreId,
      name: name.trim(),
      createdAt: nowIso(),
    };

    const { error } = await supabase.from(CATEGORIES_TABLE).insert(payload);
    if (error) {
      throw error;
    }

    return firestoreId;
  } catch (error) {
    log.error("Error creating category", error);
    throw error;
  }
}