"use server";

import { v4 as uuidv4 } from "uuid";
import { ExpenseCategory } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("expenseCategoryService");

const CATEGORIES_TABLE = "expense_categories";

const mapCategory = (row: any): ExpenseCategory => ({
  id: row?.firestore_id ?? row?.id ?? "",
  name: row?.name ?? "",
  isActive: Boolean(row?.isActive ?? false),
});

export const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CATEGORIES_TABLE)
      .select("*")
      .eq("isActive", true)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const categories = (data ?? []).map(mapCategory);
    const uniqueCategories = categories.filter(
      (category, index, self) =>
        index === self.findIndex((c) => c.id === category.id)
    );

    return uniqueCategories;
  } catch (error) {
    log.error("Error fetching expense categories", error);
    throw error;
  }
};

export const addExpenseCategory = async (
  categoryData: Omit<ExpenseCategory, "id">
): Promise<ExpenseCategory> => {
  try {
    const supabase = getSupabaseServerClient();
    const firestoreId = uuidv4();
    const payload = {
      firestore_id: firestoreId,
      name: categoryData.name,
      isActive: categoryData.isActive ?? true,
    };

    const { data, error } = await supabase
      .from(CATEGORIES_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("No se pudo crear la categoría.");
    }

    return mapCategory(data);
  } catch (error) {
    log.error("Error adding expense category", error);
    throw error;
  }
};

export const updateExpenseCategory = async (
  categoryId: string,
  dataToUpdate: Partial<Omit<ExpenseCategory, "id">>
): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(CATEGORIES_TABLE)
      .update(dataToUpdate)
      .or(`firestore_id.eq.${categoryId},id.eq.${categoryId}`);

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating expense category", error);
    throw error;
  }
};
