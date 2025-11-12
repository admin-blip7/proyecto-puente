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
  isActive: Boolean(row?.is_active ?? row?.isActive ?? false),
});

export const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CATEGORIES_TABLE)
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      log.error("Error fetching expense categories", { 
        error, 
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      });
      
      // Provide helpful error message
      if (error.code === '42P01') {
        throw new Error(`La tabla 'expense_categories' no existe. Por favor ejecuta el script de configuración.`);
      }
      
      throw new Error(`Error al cargar categorías: ${error.message}`);
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
      is_active: categoryData.isActive ?? true,
    };

    const { data, error } = await supabase
      .from(CATEGORIES_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      log.error("Error inserting expense category", {
        error,
        code: error?.code,
        message: error?.message,
        payload
      });
      
      if (error?.code === '42P01') {
        throw new Error(`La tabla 'expense_categories' no existe. Por favor ejecuta el script de configuración.`);
      }
      
      throw new Error(`Error al crear categoría: ${error?.message || 'Unknown error'}`);
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
    
    // Convert camelCase to snake_case for database
    const dbPayload: any = {};
    if (dataToUpdate.name !== undefined) dbPayload.name = dataToUpdate.name;
    if (dataToUpdate.isActive !== undefined) dbPayload.is_active = dataToUpdate.isActive;
    
    const { error } = await supabase
      .from(CATEGORIES_TABLE)
      .update(dbPayload)
      .or(`firestore_id.eq.${categoryId},id.eq.${categoryId}`);

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating expense category", error);
    throw error;
  }
};
