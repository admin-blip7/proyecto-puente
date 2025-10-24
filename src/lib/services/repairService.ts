"use server";

import { v4 as uuidv4 } from "uuid";
import { RepairOrder, Product } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("repairService");

const REPAIRS_TABLE = "repair_orders";
const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";

const mapRepairOrder = (row: any): RepairOrder => ({
  id: row?.firestore_id ?? row?.id ?? "",
  orderId: row?.orderId ?? "",
  status: row?.status ?? "Recibido",
  customerName: row?.customerName ?? "",
  customerPhone: row?.customerPhone ?? "",
  deviceBrand: row?.deviceBrand ?? "",
  deviceModel: row?.deviceModel ?? "",
  deviceSerialIMEI: row?.deviceSerialIMEI ?? "",
  reportedIssue: row?.reportedIssue ?? "",
  technicianNotes: row?.technicianNotes ?? undefined,
  partsUsed: Array.isArray(row?.partsUsed) ? row.partsUsed : [],
  laborCost: Number(row?.laborCost ?? 0),
  totalCost: Number(row?.totalCost ?? 0),
  totalPrice: Number(row?.totalPrice ?? 0),
  profit: Number(row?.profit ?? 0),
  createdAt: toDate(row?.createdAt),
  completedAt: row?.completedAt ? toDate(row.completedAt) : undefined,
});

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

export const getRepairOrders = async (): Promise<RepairOrder[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(REPAIRS_TABLE)
      .select("*")
      .order("createdAt", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapRepairOrder);
  } catch (error) {
    log.error("Error fetching repair orders", error);
    return [];
  }
};

const getNextOrderId = async (): Promise<string> => {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from(REPAIRS_TABLE)
    .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  const next = (Number(count ?? 0) + 1).toString().padStart(4, "0");
  return `REP-${next}`;
};

export const addRepairOrder = async (
  orderData: Omit<RepairOrder, "id" | "orderId" | "createdAt" | "status">
): Promise<RepairOrder> => {
  try {
    const supabase = getSupabaseServerClient();
    const orderId = await getNextOrderId();
    const firestoreId = uuidv4();
    const createdAt = nowIso();

    const payload = {
      firestore_id: firestoreId,
      orderId,
      status: "Recibido" as const,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      deviceBrand: orderData.deviceBrand,
      deviceModel: orderData.deviceModel,
      deviceSerialIMEI: orderData.deviceSerialIMEI,
      reportedIssue: orderData.reportedIssue,
      technicianNotes: orderData.technicianNotes ?? null,
      partsUsed: orderData.partsUsed ?? [],
      laborCost: orderData.laborCost ?? 0,
      totalCost: orderData.totalCost ?? 0,
      totalPrice: orderData.totalPrice ?? 0,
      profit: orderData.profit ?? 0,
      createdAt,
      completedAt: null,
    };

    const { data, error } = await supabase
      .from(REPAIRS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Failed to add repair order");
    }

    const repairOrder = mapRepairOrder(data);

    // Auto-create or link CRM client for repairs
    if (orderData.customerName && orderData.customerPhone) {
      try {
        log.info(`Creating/linking CRM client for repair: ${orderData.customerName}`);
        const { createCRMClientFromSale } = await import("./crmClientService");
        
        const crmClient = await createCRMClientFromSale({
          name: orderData.customerName,
          phone: orderData.customerPhone,
          saleAmount: orderData.totalPrice,
          saleId: orderId,
          interactionType: 'repair'
        });

        if (crmClient && crmClient.id) {
          log.info(`Linked repair order ${orderId} to CRM client: ${crmClient.id}`);
        }
      } catch (crmError) {
        log.warn(`Could not create/link CRM client for repair ${orderId}:`, crmError);
        // Don't break repair creation if CRM fails
      }
    }

    return repairOrder;
  } catch (error) {
    log.error("Error adding repair order", error);
    throw new Error("Failed to add repair order.");
  }
};

export const updateRepairOrder = async (
  orderId: string,
  dataToUpdate: Partial<RepairOrder>
): Promise<void> => {
  try {
    const supabase = getSupabaseServerClient();
    const updates: Record<string, any> = { ...dataToUpdate };
    if (dataToUpdate.createdAt instanceof Date) {
      updates.createdAt = dataToUpdate.createdAt.toISOString();
    }
    if (dataToUpdate.completedAt instanceof Date) {
      updates.completedAt = dataToUpdate.completedAt.toISOString();
    }

    const { error } = await supabase
      .from(REPAIRS_TABLE)
      .update(updates)
      .or(orIdFilter(orderId));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating repair order", error);
    throw new Error("Failed to update repair order.");
  }
};

export const addPartToRepairOrder = async (
  order: RepairOrder,
  part: Product,
  quantity: number,
  userId: string
): Promise<RepairOrder> => {
  const supabase = getSupabaseServerClient();

  const { data: productRow, error: productError } = await supabase
    .from(PRODUCTS_TABLE)
    .select("firestore_id,stock,cost,price,name")
    .or(orIdFilter(part.id))
    .maybeSingle();

  if (productError || !productRow) {
    throw new Error("Producto no encontrado.");
  }

  const currentStock = Number(productRow.stock ?? 0);
  if (currentStock < quantity) {
    throw new Error("Stock insuficiente o producto no encontrado.");
  }

  const newStock = currentStock - quantity;
  const { error: stockError } = await supabase
    .from(PRODUCTS_TABLE)
    .update({ stock: newStock })
    .eq("firestore_id", productRow.firestore_id ?? part.id);

  if (stockError) {
    throw new Error("No se pudo actualizar el stock del producto.");
  }

  const { error: logError } = await supabase.from(INVENTORY_LOGS_TABLE).insert({
    firestore_id: uuidv4(),
    productId: productRow.firestore_id ?? part.id,
    productName: productRow.name ?? part.name,
    change: -quantity,
    reason: "Uso en Reparación",
    updatedBy: userId,
    createdAt: nowIso(),
    metadata: { repairOrderId: order.orderId, cost: part.cost },
  });

  if (logError) {
    throw new Error("No se pudo registrar el movimiento de inventario.");
  }

  const existingPartIndex = order.partsUsed.findIndex((p) => p.productId === part.id);
  const newPartsUsed = [...order.partsUsed];

  if (existingPartIndex > -1) {
    newPartsUsed[existingPartIndex].quantity += quantity;
  } else {
    newPartsUsed.push({
      productId: part.id,
      name: part.name,
      quantity,
      cost: part.cost,
      price: part.price,
    });
  }

  const newTotalCost = newPartsUsed.reduce((sum, p) => sum + p.cost * p.quantity, 0);
  const newTotalPrice =
    newPartsUsed.reduce((sum, p) => sum + p.price * p.quantity, 0) + order.laborCost;
  const newProfit = newTotalPrice - newTotalCost;

  const updatedOrderData = {
    partsUsed: newPartsUsed,
    totalCost: newTotalCost,
    totalPrice: newTotalPrice,
    profit: newProfit,
  };

  const { error: orderUpdateError, data: updatedOrderRow } = await supabase
    .from(REPAIRS_TABLE)
    .update(updatedOrderData)
    .or(orIdFilter(order.id))
    .select("*")
    .single();

  if (orderUpdateError || !updatedOrderRow) {
    throw new Error("No se pudo actualizar la orden de reparación.");
  }

  return mapRepairOrder(updatedOrderRow);
};

