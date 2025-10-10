"use server";

import { v4 as uuidv4 } from "uuid";
import { PurchaseOrder, PurchaseOrderHistoryEntry } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("purchaseOrderService");

const PURCHASE_ORDERS_TABLE = "purchase_orders";

const mapHistoryEntry = (entry: any): PurchaseOrderHistoryEntry => ({
  action: entry?.action ?? "",
  status: entry?.status ?? "pending",
  timestamp: toDate(entry?.timestamp),
  user: entry?.user ?? "",
  notes: entry?.notes ?? undefined,
});

const mapPurchaseOrder = (row: any): PurchaseOrder => ({
  id: row?.firestore_id ?? row?.id ?? "",
  orderNumber: row?.orderNumber ?? "",
  supplier: row?.supplier ?? "",
  totalAmount: Number(row?.totalAmount ?? 0),
  status: row?.status ?? "pending",
  items: Array.isArray(row?.items) ? row.items : [],
  shippingInfo: row?.shippingInfo ?? undefined,
  notes: row?.notes ?? undefined,
  createdAt: toDate(row?.createdAt),
  updatedAt: toDate(row?.updatedAt),
  history: Array.isArray(row?.history) ? row.history.map(mapHistoryEntry) : [],
});

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

const fetchOrderRow = async (id: string) => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(PURCHASE_ORDERS_TABLE)
    .select("*")
    .or(orIdFilter(id))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
};

export async function addPurchaseOrder(
  orderData: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  try {
    log.info("Starting addPurchaseOrder", { 
      orderNumber: orderData.orderNumber,
      supplier: orderData.supplier,
      status: orderData.status,
      totalAmount: orderData.totalAmount,
      itemsCount: orderData.items?.length || 0
    });

    const supabase = getSupabaseServerClient();
    const firestoreId = uuidv4();
    const timestamp = nowIso();

    const payload = {
      firestore_id: firestoreId,
      orderNumber: orderData.orderNumber,
      supplier: orderData.supplier,
      totalAmount: orderData.totalAmount,
      status: orderData.status,
      items: orderData.items ?? [],
      shippingInfo: orderData.shippingInfo ?? null,
      notes: orderData.notes ?? null,
      history: orderData.history ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    log.info("Inserting purchase order with payload", { 
      firestoreId,
      payloadKeys: Object.keys(payload),
      payloadTypes: Object.entries(payload).reduce((acc, [key, value]) => {
        acc[key] = typeof value;
        return acc;
      }, {} as Record<string, string>)
    });

    const { data, error } = await supabase.from(PURCHASE_ORDERS_TABLE).insert(payload).select();
    
    if (error) {
      log.error("Supabase insert error", { 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    log.info("Purchase order inserted successfully", { firestoreId, data: data?.[0] });
    return firestoreId;
  } catch (error) {
    log.error("Error adding purchase order", error);
    throw error;
  }
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  try {
    const row = await fetchOrderRow(id);
    return row ? mapPurchaseOrder(row) : null;
  } catch (error) {
    log.error("Error getting purchase order", error);
    throw error;
  }
}

export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(PURCHASE_ORDERS_TABLE)
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapPurchaseOrder);
  } catch (error) {
    log.error("Error getting purchase orders", error);
    throw error;
  }
}

export async function getPurchaseOrdersBySupplier(supplierName: string): Promise<PurchaseOrder[]> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(PURCHASE_ORDERS_TABLE)
      .select("*")
      .eq("supplier", supplierName)
      .order("createdAt", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapPurchaseOrder);
  } catch (error) {
    log.error("Error getting purchase orders by supplier", error);
    throw error;
  }
}

export async function updatePurchaseOrder(
  id: string,
  updates: Partial<PurchaseOrder>
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const sanitizedUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value instanceof Date) {
        sanitizedUpdates[key] = value.toISOString();
      } else {
        sanitizedUpdates[key] = value;
      }
    });
    sanitizedUpdates.updatedAt = nowIso();

    const { error } = await supabase
      .from(PURCHASE_ORDERS_TABLE)
      .update(sanitizedUpdates)
      .or(orIdFilter(id));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating purchase order", error);
    throw error;
  }
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrder["status"],
  notes?: string,
  user: string = "Usuario Actual"
): Promise<void> {
  try {
    const row = await fetchOrderRow(id);
    if (!row) {
      throw new Error("Purchase order not found");
    }

    const history: any[] = Array.isArray(row.history) ? row.history : [];
    const newHistoryEntry = {
      action: `Estado cambiado a ${status}`,
      status,
      timestamp: nowIso(),
      user,
      notes: notes ?? null,
    };

    const { error } = await getSupabaseServerClient()
      .from(PURCHASE_ORDERS_TABLE)
      .update({
        status,
        history: [...history, newHistoryEntry],
        updatedAt: nowIso(),
      })
      .or(orIdFilter(id));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating purchase order status", error);
    throw error;
  }
}

export async function addPurchaseOrderHistoryEntry(
  id: string,
  entry: Omit<PurchaseOrderHistoryEntry, "timestamp">
): Promise<void> {
  try {
    const row = await fetchOrderRow(id);
    if (!row) {
      throw new Error("Purchase order not found");
    }

    const history: any[] = Array.isArray(row.history) ? row.history : [];
    const newHistoryEntry = {
      ...entry,
      timestamp: nowIso(),
    };

    const { error } = await getSupabaseServerClient()
      .from(PURCHASE_ORDERS_TABLE)
      .update({
        history: [...history, newHistoryEntry],
        updatedAt: nowIso(),
      })
      .or(orIdFilter(id));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error adding purchase order history entry", error);
    throw error;
  }
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(PURCHASE_ORDERS_TABLE)
      .delete()
      .or(orIdFilter(id));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error deleting purchase order", error);
    throw error;
  }
}

export async function getPurchaseOrderStatsBySupplier(supplierName: string): Promise<{
  totalOrders: number;
  totalAmount: number;
  pendingOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
}> {
  try {
    const orders = await getPurchaseOrdersBySupplier(supplierName);
    return {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      receivedOrders: orders.filter((order) => order.status === "received").length,
      cancelledOrders: orders.filter((order) => order.status === "cancelled").length,
    };
  } catch (error) {
    log.error("Error getting purchase order stats", error);
    throw error;
  }
}

export async function searchPurchaseOrdersByNumber(orderNumber: string): Promise<PurchaseOrder[]> {
  try {
    const supabase = getSupabaseServerClient();
    const normalizedNumber = orderNumber?.trim();
    if (!normalizedNumber) {
      return [];
    }

    const { data, error } = await supabase
      .from(PURCHASE_ORDERS_TABLE)
      .select("*")
      .ilike("orderNumber", `${normalizedNumber}%`)
      .order("orderNumber", { ascending: true })
      .limit(10);

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapPurchaseOrder);
  } catch (error) {
    log.error("Error searching purchase orders", error);
    throw error;
  }
}