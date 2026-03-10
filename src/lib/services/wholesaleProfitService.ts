"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { User } from "@supabase/supabase-js";
import { getLogger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import type { WholesaleProfitSetting as WholesaleProfitSettingShape } from "@/types";

const log = getLogger("wholesaleProfitService");
const TABLE_NAME = "wholesale_profit_settings";
const ADMIN_ACCESS_TOKEN_COOKIE = "tienda_admin_access_token";

export interface WholesaleProfitSetting extends WholesaleProfitSettingShape {}

interface WholesaleProfitSettingRow {
  id: string;
  category_id: string;
  category_label: string;
  profit_percentage: number | string;
  updated_at: string;
  updated_by: string | null;
}

const normalizeSetting = (row: WholesaleProfitSettingRow): WholesaleProfitSetting => ({
  id: row.id,
  category_id: row.category_id,
  category_label: row.category_label,
  profit_percentage: Number(row.profit_percentage ?? 0),
  updated_at: row.updated_at,
  updated_by: row.updated_by ?? undefined,
});

const isMissingTableError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const code = "code" in error ? String(error.code ?? "") : "";
  const message = "message" in error ? String(error.message ?? "") : "";

  return code === "PGRST205" || message.toLowerCase().includes("wholesale_profit_settings");
};

const resolveRole = (user: User | null): string => {
  if (!user) return "";

  const metadataRole = String(user.user_metadata?.role ?? "").toLowerCase();
  const appRole = String(user.app_metadata?.role ?? "").toLowerCase();
  // Default to "admin" if no role is explicitly set (matches client-side AuthProvider behavior)
  return metadataRole || appRole || "admin";
};

const getAuthenticatedUser = async (): Promise<User | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    log.warn("Could not resolve authenticated user for wholesale settings", error);
    return null;
  }

  return data.user ?? null;
};

const requireAdminUser = async (): Promise<User> => {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (resolveRole(user) !== "admin") {
    throw new Error("Forbidden");
  }

  return user;
};

const ensureValidPercentage = (value: number) => {
  if (!Number.isFinite(value)) {
    throw new Error("El porcentaje de ganancia es inválido.");
  }

  if (value < 0 || value > 1000) {
    throw new Error("El porcentaje de ganancia debe estar entre 0 y 1000.");
  }
};

const mapMutationError = (error: unknown): never => {
  if (isMissingTableError(error)) {
    throw new Error("La tabla wholesale_profit_settings no existe. Ejecuta la migración pendiente.");
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("No se pudo completar la operación de mayoreo.");
};

export async function getWholesaleProfitSettings(): Promise<WholesaleProfitSetting[]> {
  try {
    await requireAdminUser();

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("category_label", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        log.warn("wholesale_profit_settings is not available yet", error);
        return [];
      }
      throw error;
    }

    return (data ?? []).map((row) => normalizeSetting(row as WholesaleProfitSettingRow));
  } catch (error) {
    log.error("Error fetching wholesale profit settings", error);

    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      throw error;
    }

    return [];
  }
}

export async function upsertWholesaleProfitSetting(
  categoryId: string,
  categoryLabel: string,
  profitPercentage: number,
  updatedBy: string
): Promise<WholesaleProfitSetting> {
  try {
    await requireAdminUser();
    ensureValidPercentage(profitPercentage);

    const supabase = getSupabaseServerClient();
    const payload = {
      category_id: categoryId,
      category_label: categoryLabel,
      profit_percentage: Number(profitPercentage.toFixed(2)),
      updated_at: new Date().toISOString(),
      updated_by: updatedBy.trim() || null,
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: "category_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    revalidatePath("/pos/mayoreo-config");
    return normalizeSetting(data as WholesaleProfitSettingRow);
  } catch (error) {
    log.error("Error upserting wholesale profit setting", {
      categoryId,
      categoryLabel,
      profitPercentage,
      error,
    });
    mapMutationError(error);
  }
}

export async function deleteWholesaleProfitSetting(categoryId: string): Promise<void> {
  try {
    await requireAdminUser();

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from(TABLE_NAME).delete().eq("category_id", categoryId);

    if (error) {
      throw error;
    }

    revalidatePath("/pos/mayoreo-config");
  } catch (error) {
    log.error("Error deleting wholesale profit setting", { categoryId, error });
    mapMutationError(error);
  }
}

export async function getWholesaleProfitForCategory(categoryId: string): Promise<number | null> {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !categoryId) {
      return null;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("profit_percentage")
      .eq("category_id", categoryId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        log.warn("wholesale_profit_settings is not available yet", error);
        return null;
      }
      throw error;
    }

    if (!data) {
      return null;
    }

    return Number(data.profit_percentage ?? 0);
  } catch (error) {
    log.error("Error fetching wholesale profit for category", { categoryId, error });
    return null;
  }
}
