'use server';

import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("categoryService");
const TABLE_NAME = "product_categories";

export interface ProductCategory {
  id: string;
  value: string;
  label: string;
  created_at?: string;
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const supabase = getSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('label', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    log.error("Error fetching categories:", error);
    return [];
  }
}

export async function createProductCategory(label: string): Promise<ProductCategory> {
  const supabase = getSupabaseServerClient();

  // Simple slug generator
  const value = label.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({ label, value })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    log.error("Error creating category:", error);
    throw new Error("Failed to create category");
  }
}

export async function deleteProductCategory(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    log.error("Error deleting category:", error);
    throw new Error("Failed to delete category");
  }
}

export async function createCategory(label: string): Promise<string> {
  const cat = await createProductCategory(label);
  return cat.id;
}

export async function searchCategories(query: string): Promise<ProductCategory[]> {
  const all = await getProductCategories();
  if (!query) return all;
  const lower = query.toLowerCase();
  return all.filter(c => c.label.toLowerCase().includes(lower));
}