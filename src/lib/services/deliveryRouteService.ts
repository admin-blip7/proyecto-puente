import {
  DeliveryRoute,
  DeliveryRouteStatus,
  DeliveryRouteStop,
  RouteType,
} from "@/types";
import {
  applyDeliveryScope,
  getDeliveryScope,
  getDeliverySupabaseClient,
  normalizeTime,
} from "@/lib/services/deliveryShared";
import { optimizeRoute as optimizeStops } from "@/lib/services/deliveryMapService";

export type RouteFilters = {
  date?: string;
  status?: DeliveryRouteStatus | "all";
  driverId?: string;
  branchId?: string;
};

export type CreateRoutePayload = {
  routeCode: string;
  routeName?: string;
  routeType?: RouteType;
  assignedTo?: string;
  driverId?: string;
  branchId?: string;
  deliveryDate: string;
  departureTime?: string;
  estimatedReturnTime?: string;
  notes?: string;
  internalNotes?: string;
};

const mapRoute = (row: any): DeliveryRoute => ({
  id: row.id,
  routeCode: row.route_code,
  routeName: row.route_name ?? undefined,
  routeType: row.route_type,
  assignedTo: row.assigned_to ?? undefined,
  driverId: row.driver_id ?? undefined,
  branchId: row.branch_id ?? undefined,
  deliveryDate: new Date(row.delivery_date),
  departureTime: row.departure_time ?? undefined,
  estimatedReturnTime: row.estimated_return_time ?? undefined,
  status: row.status,
  startedAt: row.started_at ? new Date(row.started_at) : undefined,
  completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  totalOrders: Number(row.total_orders ?? 0),
  totalDeliveries: Number(row.total_deliveries ?? 0),
  totalFailedDeliveries: Number(row.total_failed_deliveries ?? 0),
  totalAmount: Number(row.total_amount ?? 0),
  notes: row.notes ?? undefined,
  internalNotes: row.internal_notes ?? undefined,
  partnerId: row.partner_id,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  stops: Array.isArray(row.delivery_route_stops)
    ? row.delivery_route_stops.map((stop: any) => ({
        id: stop.id,
        routeId: stop.route_id,
        stopSequence: stop.stop_sequence,
        stopType: stop.stop_type,
        crmClientId: stop.crm_client_id ?? undefined,
        customerName: stop.customer_name ?? undefined,
        address: stop.address,
        city: stop.city ?? undefined,
        state: stop.state ?? undefined,
        zipCode: stop.zip_code ?? undefined,
        phone: stop.phone ?? undefined,
        latitude: stop.latitude != null ? Number(stop.latitude) : undefined,
        longitude: stop.longitude != null ? Number(stop.longitude) : undefined,
        estimatedArrival: stop.estimated_arrival ?? undefined,
        estimatedDeparture: stop.estimated_departure ?? undefined,
        status: stop.status,
        arrivedAt: stop.arrived_at ? new Date(stop.arrived_at) : undefined,
        completedAt: stop.completed_at ? new Date(stop.completed_at) : undefined,
        failureReason: stop.failure_reason ?? undefined,
        deliveryNotes: stop.delivery_notes ?? undefined,
        specialInstructions: stop.special_instructions ?? undefined,
        partnerId: stop.partner_id,
        branchId: stop.branch_id ?? undefined,
        createdAt: new Date(stop.created_at),
        updatedAt: new Date(stop.updated_at),
      }))
    : undefined,
});

export const createRoute = async (data: CreateRoutePayload): Promise<DeliveryRoute> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  if (!scope.partnerId) {
    throw new Error("No se pudo resolver partner_id para crear la ruta");
  }

  const payload = {
    route_code: data.routeCode,
    route_name: data.routeName ?? null,
    route_type: data.routeType ?? "standard",
    assigned_to: data.assignedTo ?? null,
    driver_id: data.driverId ?? null,
    branch_id: data.branchId ?? scope.branchId ?? null,
    delivery_date: data.deliveryDate,
    departure_time: normalizeTime(data.departureTime),
    estimated_return_time: normalizeTime(data.estimatedReturnTime),
    notes: data.notes ?? null,
    internal_notes: data.internalNotes ?? null,
    partner_id: scope.partnerId,
  };

  const { data: row, error } = await supabase
    .from("delivery_routes")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return mapRoute(row);
};

export const getRoutes = async (filters: RouteFilters = {}): Promise<DeliveryRoute[]> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase.from("delivery_routes").select("*").order("delivery_date", { ascending: false });
  query = applyDeliveryScope(query as any, {
    partnerId: scope.partnerId,
    branchId: filters.branchId ?? scope.branchId,
  });

  if (filters.date) query = query.eq("delivery_date", filters.date);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.driverId) query = query.eq("driver_id", filters.driverId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapRoute);
};

export const getRouteById = async (id: string): Promise<DeliveryRoute | null> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase
    .from("delivery_routes")
    .select("*, delivery_route_stops(*)")
    .eq("id", id)
    .maybeSingle();

  query = applyDeliveryScope(query as any, scope);
  const { data, error } = await query;
  if (error) throw error;
  if (!data) return null;

  return mapRoute(data);
};

export const updateRoute = async (id: string, data: Partial<CreateRoutePayload>) => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase.from("delivery_routes").update({
    route_name: data.routeName,
    route_type: data.routeType,
    assigned_to: data.assignedTo,
    driver_id: data.driverId,
    branch_id: data.branchId,
    delivery_date: data.deliveryDate,
    departure_time: normalizeTime(data.departureTime),
    estimated_return_time: normalizeTime(data.estimatedReturnTime),
    notes: data.notes,
    internal_notes: data.internalNotes,
  }).eq("id", id).select("*").single();

  query = applyDeliveryScope(query as any, scope);

  const { data: row, error } = await query;
  if (error) throw error;
  return mapRoute(row);
};

export const deleteRoute = async (id: string): Promise<void> => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase.from("delivery_routes").delete().eq("id", id);
  query = applyDeliveryScope(query as any, scope);

  const { error } = await query;
  if (error) throw error;
};

export const assignDriver = async (routeId: string, driverId: string, assignedTo?: string) => {
  return updateRoute(routeId, { driverId, assignedTo });
};

export const startRoute = async (routeId: string) => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase
    .from("delivery_routes")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", routeId)
    .select("*")
    .single();

  query = applyDeliveryScope(query as any, scope);
  const { data, error } = await query;
  if (error) throw error;
  return mapRoute(data);
};

export const completeRoute = async (routeId: string) => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let query = supabase
    .from("delivery_routes")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", routeId)
    .select("*")
    .single();

  query = applyDeliveryScope(query as any, scope);
  const { data, error } = await query;
  if (error) throw error;
  return mapRoute(data);
};

export const getRouteManifest = async (routeId: string) => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let routeQuery = supabase
    .from("delivery_routes")
    .select("*")
    .eq("id", routeId)
    .maybeSingle();
  routeQuery = applyDeliveryScope(routeQuery as any, scope);

  let stopQuery = supabase
    .from("delivery_route_stops")
    .select("*, delivery_items(*)")
    .eq("route_id", routeId)
    .order("stop_sequence", { ascending: true });
  stopQuery = applyDeliveryScope(stopQuery as any, scope);

  const [{ data: route, error: routeError }, { data: stops, error: stopError }] = await Promise.all([
    routeQuery,
    stopQuery,
  ]);

  if (routeError) throw routeError;
  if (stopError) throw stopError;

  return {
    route: route ? mapRoute(route) : null,
    stops: (stops || []).map((stop: any) => ({
      ...stop,
      latitude: stop.latitude != null ? Number(stop.latitude) : undefined,
      longitude: stop.longitude != null ? Number(stop.longitude) : undefined,
      delivery_items: (stop.delivery_items || []).map((it: any) => ({
        ...it,
        quantity: Number(it.quantity ?? 0),
        delivered_quantity: Number(it.delivered_quantity ?? 0),
      })),
    })),
  };
};

export const optimizeRoute = async (routeId: string) => {
  const supabase = await getDeliverySupabaseClient();
  const scope = await getDeliveryScope();

  let stopQuery = supabase
    .from("delivery_route_stops")
    .select("id, address, latitude, longitude, stop_sequence")
    .eq("route_id", routeId)
    .order("stop_sequence", { ascending: true });
  stopQuery = applyDeliveryScope(stopQuery as any, scope);

  const { data: stops, error } = await stopQuery;
  if (error) throw error;

  const optimized = await optimizeStops(
    (stops || []).map((s: any) => ({
      id: s.id,
      address: s.address,
      latitude: s.latitude != null ? Number(s.latitude) : null,
      longitude: s.longitude != null ? Number(s.longitude) : null,
      stopSequence: s.stop_sequence,
    }))
  );

  await Promise.all(
    optimized.map((stop, index) => {
      let update = supabase
        .from("delivery_route_stops")
        .update({ stop_sequence: index + 1, latitude: stop.latitude, longitude: stop.longitude })
        .eq("id", stop.id)
        .eq("route_id", routeId);
      update = applyDeliveryScope(update as any, scope);
      return update;
    })
  );

  return getRouteById(routeId);
};

export const getRoutesTodayCount = async () => {
  const today = new Date().toISOString().split("T")[0];
  const routes = await getRoutes({ date: today, status: "all" });
  return routes.length;
};
