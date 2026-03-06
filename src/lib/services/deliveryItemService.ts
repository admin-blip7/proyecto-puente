import { DeliveryItem, DeliveryItemStatus } from "@/types";
import { applyDeliveryScope, getDeliveryScope, getDeliverySupabaseClient } from "@/lib/services/deliveryShared";

const mapItem = (row: any): DeliveryItem => ({
  id: row.id,
  routeStopId: row.route_stop_id,
  routeId: row.route_id,
  saleId: row.sale_id ?? undefined,
  saleItemId: row.sale_item_id ?? undefined,
  productId: row.product_id ?? undefined,
  productName: row.product_name,
  productSku: row.product_sku ?? undefined,
  quantity: Number(row.quantity ?? 0),
  deliveredQuantity: Number(row.delivered_quantity ?? 0),
  status: row.status,
  deliveryPhotoUrl: row.delivery_photo_url ?? undefined,
  recipientSignature: row.recipient_signature ?? undefined,
  recipientName: row.recipient_name ?? undefined,
  notes: row.notes ?? undefined,
  partnerId: row.partner_id,
  branchId: row.branch_id ?? undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export const getItemsByStop = async (stopId: string): Promise<DeliveryItem[]> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase.from("delivery_items").select("*").eq("route_stop_id", stopId);
  query = applyDeliveryScope(query as any, scope);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapItem);
};

export const updateItemDeliveryStatus = async (
  id: string,
  status: DeliveryItemStatus,
  deliveredQuantity?: number
): Promise<DeliveryItem> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  const payload: any = { status };
  if (typeof deliveredQuantity === "number") payload.delivered_quantity = deliveredQuantity;

  let query = supabase.from("delivery_items").update(payload).eq("id", id).select("*").single();
  query = applyDeliveryScope(query as any, scope);

  const { data, error } = await query;
  if (error) throw error;
  return mapItem(data);
};

export const recordItemConfirmation = async (
  itemId: string,
  data: {
    recipientName?: string;
    recipientSignature?: string;
    deliveryPhotoUrl?: string;
    notes?: string;
    deliveredQuantity?: number;
    status?: DeliveryItemStatus;
  }
): Promise<DeliveryItem> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase
    .from("delivery_items")
    .update({
      recipient_name: data.recipientName,
      recipient_signature: data.recipientSignature,
      delivery_photo_url: data.deliveryPhotoUrl,
      notes: data.notes,
      delivered_quantity: data.deliveredQuantity,
      status: data.status,
    })
    .eq("id", itemId)
    .select("*")
    .single();

  query = applyDeliveryScope(query as any, scope);

  const { data: row, error } = await query;
  if (error) throw error;
  return mapItem(row);
};

export const getUndeliveredItems = async (routeId: string): Promise<DeliveryItem[]> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase
    .from("delivery_items")
    .select("*")
    .eq("route_id", routeId)
    .in("status", ["pending", "returned", "damaged"]);

  query = applyDeliveryScope(query as any, scope);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapItem);
};
