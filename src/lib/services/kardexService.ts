"use server";

import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { nowIso, toDate } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";
import { KardexEntry, KardexMovementType, KardexStockActual } from "@/types";

const log = getLogger("kardexService");

const KARDEX_TABLE = "kardex";
const PRODUCTS_TABLE = "products";
const STOCK_VIEW = "stock_actual";

const mapKardexEntry = (row: any): KardexEntry => ({
  id: row?.id ?? "",
  productoId: row?.producto_id ?? "",
  tipo: row?.tipo ?? "INGRESO",
  concepto: row?.concepto ?? "",
  cantidad: Number(row?.cantidad ?? 0),
  stockAnterior: Number(row?.stock_anterior ?? 0),
  stockNuevo: Number(row?.stock_nuevo ?? 0),
  precioUnitario:
    row?.precio_unitario === null || row?.precio_unitario === undefined
      ? null
      : Number(row?.precio_unitario),
  valorTotal:
    row?.valor_total === null || row?.valor_total === undefined
      ? null
      : Number(row?.valor_total),
  referencia: row?.referencia ?? null,
  usuarioId: row?.usuario_id ?? null,
  notas: row?.notas ?? null,
  createdAt: toDate(row?.created_at),
});

const mapStockActual = (row: any): KardexStockActual => ({
  productoId: row?.producto_id ?? "",
  stockActual: Number(row?.stock_actual ?? 0),
  ultimaActualizacion: toDate(row?.ultima_actualizacion),
});

export interface RegisterKardexMovementInput {
  productoId: string;
  tipo: KardexMovementType;
  concepto: string;
  cantidad: number;
  precioUnitario?: number | null;
  valorTotal?: number | null;
  referencia?: string | null;
  usuarioId?: string | null;
  notas?: string | null;
  stockAnterior?: number;
}

export const registerKardexMovement = async (
  input: RegisterKardexMovementInput
): Promise<{ entry: KardexEntry | null; error?: string }> => {
  try {
    const supabase = getSupabaseServerClient();
    const cantidad = Number(input.cantidad ?? 0);

    if (!input.productoId) {
      return { entry: null, error: "Producto inválido para Kardex." };
    }

    if (!cantidad || cantidad <= 0) {
      return { entry: null, error: "La cantidad debe ser mayor a cero." };
    }

    let stockAnterior = input.stockAnterior;
    if (stockAnterior === undefined || stockAnterior === null) {
      const { data: productRow, error: productError } = await supabase
        .from(PRODUCTS_TABLE)
        .select("stock")
        .eq("id", input.productoId)
        .maybeSingle();

      if (productError) {
        log.error("Error obteniendo stock actual del producto:", productError);
        return { entry: null, error: "No se pudo obtener el stock actual del producto." };
      }

      stockAnterior = Number(productRow?.stock ?? 0);
    }

    const delta = input.tipo === "INGRESO" ? cantidad : -cantidad;
    const stockNuevo = Number(stockAnterior) + delta;

    if (stockNuevo < 0) {
      return { entry: null, error: "No se permite stock negativo." };
    }

    const precioUnitario = input.precioUnitario ?? null;
    const valorTotal =
      input.valorTotal ?? (precioUnitario !== null ? precioUnitario * cantidad : null);

    const payload = {
      producto_id: input.productoId,
      tipo: input.tipo,
      concepto: input.concepto,
      cantidad,
      stock_anterior: Number(stockAnterior),
      stock_nuevo: stockNuevo,
      precio_unitario: precioUnitario,
      valor_total: valorTotal,
      referencia: input.referencia ?? null,
      usuario_id: input.usuarioId ?? null,
      notas: input.notas ?? null,
      created_at: nowIso(),
    };

    const { data, error } = await supabase
      .from(KARDEX_TABLE)
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error) {
      log.error("Error registrando movimiento en kardex:", error);
      return { entry: null, error: "No se pudo registrar el movimiento en Kardex." };
    }

    return { entry: data ? mapKardexEntry(data) : null };
  } catch (error) {
    log.error("Error registrando movimiento en kardex:", error);
    return { entry: null, error: "Ocurrió un error inesperado en Kardex." };
  }
};

export interface KardexFilters {
  startDate?: string;
  endDate?: string;
  tipo?: KardexMovementType;
}

export const getKardexEntries = async (
  productoId: string,
  filters: KardexFilters = {}
): Promise<KardexEntry[]> => {
  try {
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from(KARDEX_TABLE)
      .select("*")
      .eq("producto_id", productoId);

    if (filters.tipo) {
      query = query.eq("tipo", filters.tipo);
    }

    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      log.error("Error consultando kardex:", error);
      return [];
    }

    return (data ?? []).map(mapKardexEntry);
  } catch (error) {
    log.error("Error consultando kardex:", error);
    return [];
  }
};

export const getStockActualByProductId = async (
  productoId: string
): Promise<KardexStockActual | null> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(STOCK_VIEW)
      .select("producto_id, stock_actual, ultima_actualizacion")
      .eq("producto_id", productoId)
      .maybeSingle();

    if (error) {
      log.error("Error consultando stock actual:", error);
      return null;
    }

    return data ? mapStockActual(data) : null;
  } catch (error) {
    log.error("Error consultando stock actual:", error);
    return null;
  }
};

// Get recent kardex entries across all products (for preview)
export interface RecentKardexEntry extends KardexEntry {
  productoNombre?: string;
  productoSku?: string;
}

export const getRecentKardexEntries = async (
  limit: number = 10
): Promise<RecentKardexEntry[]> => {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from(KARDEX_TABLE)
      .select(`
        *,
        products:producto_id (name, sku)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      log.error("Error consultando movimientos recientes de kardex:", error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      ...mapKardexEntry(row),
      productoNombre: row?.products?.name ?? "Producto eliminado",
      productoSku: row?.products?.sku ?? "N/A",
    }));
  } catch (error) {
    log.error("Error consultando movimientos recientes de kardex:", error);
    return [];
  }
};
