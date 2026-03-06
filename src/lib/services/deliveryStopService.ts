import { DeliveryRouteStop, DeliveryStopStatus } from "@/types";
import { applyDeliveryScope, getDeliveryScope, getDeliverySupabaseClient } from "@/lib/services/deliveryShared";

export type DeliveryStopPayload = {
  stopSequence: number;
  stopType?: "delivery" | "pickup" | "warehouse";
  crmClientId?: string;
  customerName?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  estimatedArrival?: string;
  estimatedDeparture?: string;
  deliveryNotes?: string;
  specialInstructions?: string;
  branchId?: string;
};

const mapStop = (row: any): DeliveryRouteStop => ({
  id: row.id,
  routeId: row.route_id,
  stopSequence: row.stop_sequence,
  stopType: row.stop_type,
  crmClientId: row.crm_client_id ?? undefined,
  customerName: row.customer_name ?? undefined,
  address: row.address,
  city: row.city ?? undefined,
  state: row.state ?? undefined,
  zipCode: row.zip_code ?? undefined,
  phone: row.phone ?? undefined,
  latitude: row.latitude != null ? Number(row.latitude) : undefined,
  longitude: row.longitude != null ? Number(row.longitude) : undefined,
  estimatedArrival: row.estimated_arrival ?? undefined,
  estimatedDeparture: row.estimated_departure ?? undefined,
  status: row.status,
  arrivedAt: row.arrived_at ? new Date(row.arrived_at) : undefined,
  completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  failureReason: row.failure_reason ?? undefined,
  deliveryNotes: row.delivery_notes ?? undefined,
  specialInstructions: row.special_instructions ?? undefined,
  partnerId: row.partner_id,
  branchId: row.branch_id ?? undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export const addStopToRoute = async (routeId: string, stopData: DeliveryStopPayload): Promise<DeliveryRouteStop> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  if (!scope.partnerId) throw new Error("No hay partner_id en contexto");

  const payload = {
    route_id: routeId,
    stop_sequence: stopData.stopSequence,
    stop_type: stopData.stopType ?? "delivery",
    crm_client_id: stopData.crmClientId ?? null,
    customer_name: stopData.customerName ?? null,
    address: stopData.address,
    city: stopData.city ?? null,
    state: stopData.state ?? null,
    zip_code: stopData.zipCode ?? null,
    phone: stopData.phone ?? null,
    latitude: stopData.latitude ?? null,
    longitude: stopData.longitude ?? null,
    estimated_arrival: stopData.estimatedArrival ?? null,
    estimated_departure: stopData.estimatedDeparture ?? null,
    delivery_notes: stopData.deliveryNotes ?? null,
    special_instructions: stopData.specialInstructions ?? null,
    partner_id: scope.partnerId,
    branch_id: stopData.branchId ?? scope.branchId ?? null,
  };

  const { data, error } = await supabase
    .from("delivery_route_stops")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return mapStop(data);
};

export const updateStop = async (id: string, data: Partial<DeliveryStopPayload>) => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase
    .from("delivery_route_stops")
    .update({
      stop_sequence: data.stopSequence,
      stop_type: data.stopType,
      crm_client_id: data.crmClientId,
      customer_name: data.customerName,
      address: data.address,
      city: data.city,
      state: data.state,
      zip_code: data.zipCode,
      phone: data.phone,
      latitude: data.latitude,
      longitude: data.longitude,
      estimated_arrival: data.estimatedArrival,
      estimated_departure: data.estimatedDeparture,
      delivery_notes: data.deliveryNotes,
      special_instructions: data.specialInstructions,
      branch_id: data.branchId,
    })
    .eq("id", id)
    .select("*")
    .single();

  query = applyDeliveryScope(query as any, scope);

  const { data: row, error } = await query;
  if (error) throw error;
  return mapStop(row);
};

export const updateStopStatus = async (id: string, status: DeliveryStopStatus, failureReason?: string) => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  const payload: any = { status };
  if (status === "arrived") payload.arrived_at = new Date().toISOString();
  if (status === "completed") payload.completed_at = new Date().toISOString();
  if (status === "failed") payload.failure_reason = failureReason ?? "Sin especificar";

  let query = supabase.from("delivery_route_stops").update(payload).eq("id", id).select("*").single();
  query = applyDeliveryScope(query as any, scope);

  const { data, error } = await query;
  if (error) throw error;
  return mapStop(data);
};

export const getStopsByRoute = async (routeId: string): Promise<DeliveryRouteStop[]> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase
    .from("delivery_route_stops")
    .select("*")
    .eq("route_id", routeId)
    .order("stop_sequence", { ascending: true });

  query = applyDeliveryScope(query as any, scope);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapStop);
};

export const markStopArrived = async (id: string) => updateStopStatus(id, "arrived");
export const markStopCompleted = async (id: string) => updateStopStatus(id, "completed");

export const recordDeliveryConfirmation = async (
  stopId: string,
  data: {
    deliveryItemId?: string;
    photoUrl: string;
    photoPublicUrl?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    takenBy?: string;
  }
) => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  if (!scope.partnerId) throw new Error("No hay partner_id en contexto");

  const { data: stop, error: stopError } = await supabase
    .from("delivery_route_stops")
    .select("branch_id")
    .eq("id", stopId)
    .maybeSingle();

  if (stopError) throw stopError;

  const { data: row, error } = await supabase
    .from("delivery_confirmations")
    .insert({
      route_stop_id: stopId,
      delivery_item_id: data.deliveryItemId ?? null,
      photo_url: data.photoUrl,
      photo_public_url: data.photoPublicUrl ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      notes: data.notes ?? null,
      taken_by: data.takenBy ?? null,
      partner_id: scope.partnerId,
      branch_id: stop?.branch_id ?? scope.branchId ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return row;
};
