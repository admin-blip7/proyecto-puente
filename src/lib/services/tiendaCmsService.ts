"use server";

import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { nowIso } from "@/lib/supabase/utils";

export interface TiendaCmsDashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  monthlyRevenue: number;
}

export interface TiendaCmsProductRow {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  price: number;
  stock: number;
  created_at: string | null;
}

export interface TiendaCmsOrderRow {
  id: string;
  sale_number: string | null;
  customer_name: string | null;
  payment_method: string | null;
  total_amount: number;
  status: string | null;
  created_at: string | null;
}

export interface TiendaCmsSettings {
  heroTitle: string;
  heroSubtitle: string;
  supportEmail: string;
  supportPhone: string;
  updatedAt: string;
}

const SETTINGS_DOC_ID = "tienda_content";

const defaultSettings = (): TiendaCmsSettings => ({
  heroTitle: "Tecnologia premium para tu dia a dia",
  heroSubtitle: "Descubre lo ultimo en 22 Electronic",
  supportEmail: "soporte@22electronic.com",
  supportPhone: "+52 55 0000 0000",
  updatedAt: nowIso(),
});

export async function getTiendaCmsDashboardStats(): Promise<TiendaCmsDashboardStats> {
  const supabase = getSupabaseServerClient();

  const [{ count: productsCount }, { count: lowStockCount }, { count: ordersCount }, { data: monthSales }] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 5),
      supabase.from("sales").select("id", { count: "exact", head: true }),
      supabase
        .from("sales")
        .select("total_amount, created_at")
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

  const monthlyRevenue = (monthSales || []).reduce((sum, row: any) => sum + Number(row?.total_amount || 0), 0);

  return {
    totalProducts: productsCount || 0,
    lowStockProducts: lowStockCount || 0,
    totalOrders: ordersCount || 0,
    monthlyRevenue,
  };
}

export async function getTiendaCmsProducts(limit = 50): Promise<TiendaCmsProductRow[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, sku, category, price, stock, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map((row: any) => ({
    id: String(row.id),
    name: row.name ?? "Sin nombre",
    sku: row.sku ?? null,
    category: row.category ?? null,
    price: Number(row.price || 0),
    stock: Number(row.stock || 0),
    created_at: row.created_at ?? null,
  }));
}

export async function getTiendaCmsOrders(limit = 50): Promise<TiendaCmsOrderRow[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("sales")
    .select("id, sale_number, customer_name, payment_method, total_amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map((row: any) => ({
    id: String(row.id),
    sale_number: row.sale_number ?? null,
    customer_name: row.customer_name ?? null,
    payment_method: row.payment_method ?? null,
    total_amount: Number(row.total_amount || 0),
    status: row.status ?? null,
    created_at: row.created_at ?? null,
  }));
}

export async function getTiendaCmsSettings(): Promise<TiendaCmsSettings> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("settings")
    .select("id, data, last_updated")
    .eq("id", SETTINGS_DOC_ID)
    .maybeSingle();

  if (!data?.data || typeof data.data !== "object") {
    return defaultSettings();
  }

  const merged = {
    ...defaultSettings(),
    ...(data.data as Record<string, unknown>),
    updatedAt: typeof data.last_updated === "string" ? data.last_updated : nowIso(),
  };

  return {
    heroTitle: String(merged.heroTitle),
    heroSubtitle: String(merged.heroSubtitle),
    supportEmail: String(merged.supportEmail),
    supportPhone: String(merged.supportPhone),
    updatedAt: String(merged.updatedAt),
  };
}

export async function saveTiendaCmsSettings(input: Omit<TiendaCmsSettings, "updatedAt">): Promise<void> {
  const supabase = getSupabaseServerClient();
  const payload = {
    heroTitle: input.heroTitle.trim(),
    heroSubtitle: input.heroSubtitle.trim(),
    supportEmail: input.supportEmail.trim(),
    supportPhone: input.supportPhone.trim(),
    updatedAt: nowIso(),
  };

  await supabase.from("settings").upsert(
    {
      id: SETTINGS_DOC_ID,
      data: payload,
      last_updated: nowIso(),
    },
    { onConflict: "id" }
  );
}
