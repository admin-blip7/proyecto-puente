import { supabase } from "@/lib/supabaseClient";
import { SINGLE_DELIVERY_DRIVER, sanitizeWhatsappPhone } from "@/lib/deliveryDriverConfig";

export type DeliveryRouteStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface DeliveryRouteSummary {
  id: string;
  routeCode: string;
  routeName: string | null;
  routeType: string | null;
  assignedTo: string | null;
  driverId: string | null;
  branchId: string | null;
  deliveryDate: string;
  departureTime: string | null;
  status: DeliveryRouteStatus;
  totalOrders: number;
  totalDeliveries: number;
  totalFailedDeliveries: number;
  totalAmount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RouteFilters {
  date?: string;
  status?: DeliveryRouteStatus | "all";
}

export interface CreateRoutePayload {
  routeCode: string;
  routeName?: string;
  routeType?: string;
  assignedTo?: string;
  driverId?: string;
  branchId?: string;
  deliveryDate: string;
  departureTime?: string;
}

export interface RouteDeliverySale {
  id: string;
  saleNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  address: string;
  deliveryTime: string;
  items: Array<{ name: string; quantity: number; priceAtSale: number }>;
}

const ensureClient = () => {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }
  return supabase;
};

const mapRoute = (row: any): DeliveryRouteSummary => ({
  id: row?.id ?? "",
  routeCode: row?.route_code ?? "",
  routeName: row?.route_name ?? null,
  routeType: row?.route_type ?? null,
  assignedTo: row?.assigned_to ?? null,
  driverId: row?.driver_id ?? null,
  branchId: row?.branch_id ?? null,
  deliveryDate: row?.delivery_date ?? "",
  departureTime: row?.departure_time ?? null,
  status: (row?.status ?? "pending") as DeliveryRouteStatus,
  totalOrders: Number(row?.total_orders ?? 0),
  totalDeliveries: Number(row?.total_deliveries ?? 0),
  totalFailedDeliveries: Number(row?.total_failed_deliveries ?? 0),
  totalAmount: Number(row?.total_amount ?? 0),
  createdAt: row?.created_at ?? null,
  updatedAt: row?.updated_at ?? null,
});

const getAuthContext = async () => {
  if (!supabase) return { partnerId: null as string | null, branchId: null as string | null };

  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    const partnerId = (user?.user_metadata?.partner_id as string | undefined) || null;
    const branchId = (user?.user_metadata?.branch_id as string | undefined) || null;
    return { partnerId, branchId };
  } catch {
    return { partnerId: null, branchId: null };
  }
};

const mapRouteSale = (row: any): RouteDeliverySale => {
  const shippingInfo = row?.shipping_info || {};
  return {
    id: row?.id ?? "",
    saleNumber: row?.sale_number ?? row?.id ?? "",
    customerName: row?.customer_name || "Cliente",
    customerPhone: row?.customer_phone || "",
    totalAmount: Number(row?.total_amount ?? 0),
    address:
      shippingInfo?.deliveryAddress ||
      shippingInfo?.address ||
      row?.customer_address ||
      "Dirección no especificada",
    deliveryTime: shippingInfo?.deliveryTime || "",
    items: Array.isArray(row?.sale_items)
      ? row.sale_items.map((item: any) => ({
          name: item?.product_name || "Producto",
          quantity: Number(item?.quantity ?? 0),
          priceAtSale: Number(item?.price_at_sale ?? 0),
        }))
      : [],
  };
};

const escapeWhatsAppText = (text: string) => encodeURIComponent(text);

export const buildDriverWhatsappMessage = (route: DeliveryRouteSummary, sales: RouteDeliverySale[]) => {
  const header = [
    "Ruta asignada",
    `Repartidor: ${SINGLE_DELIVERY_DRIVER.name}`,
    `Ruta: ${route.routeCode}`,
    `Fecha: ${route.deliveryDate || "Sin fecha"}`,
    `Hora salida: ${route.departureTime || "No definida"}`,
    "",
    "Entregas:",
  ];

  const lines = sales.flatMap((sale, saleIndex) => {
    const saleLines: string[] = [];
    saleLines.push(`${saleIndex + 1}. ${sale.customerName}`);
    saleLines.push(`   Dirección: ${sale.address}`);
    saleLines.push(`   Tel: ${sale.customerPhone || "N/A"}`);
    saleLines.push(`   Hora: ${sale.deliveryTime || "No definida"}`);
    saleLines.push(`   Cobrar: $${sale.totalAmount.toFixed(2)}`);
    if (sale.items.length > 0) {
      saleLines.push("   Artículos:");
      sale.items.forEach((item) => {
        saleLines.push(`   - ${item.name} x${item.quantity} ($${item.priceAtSale.toFixed(2)})`);
      });
    }
    saleLines.push("");
    return saleLines;
  });

  return [...header, ...lines].join("\n").trim();
};

export async function getRoutes(filters: RouteFilters = {}): Promise<DeliveryRouteSummary[]> {
  try {
    const client = ensureClient();

    let query = client
      .from("delivery_routes")
      .select("*")
      .order("delivery_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filters.date) {
      query = query.eq("delivery_date", filters.date);
    }

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    query = query.eq("assigned_to", SINGLE_DELIVERY_DRIVER.name);

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data || []).map(mapRoute);
  } catch (error) {
    console.error("getRoutes error:", error);
    return [];
  }
}

export async function getRouteById(routeId: string): Promise<DeliveryRouteSummary | null> {
  try {
    const client = ensureClient();
    const { data, error } = await client
      .from("delivery_routes")
      .select("*")
      .eq("id", routeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) return null;
    return mapRoute(data);
  } catch (error) {
    console.error("getRouteById error:", error);
    return null;
  }
}

export async function getRouteSales(routeId: string): Promise<RouteDeliverySale[]> {
  try {
    const client = ensureClient();
    const { data, error } = await client
      .from("sales")
      .select("id, sale_number, customer_name, customer_phone, total_amount, shipping_info, sale_items(*)")
      .eq("route_id", routeId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map(mapRouteSale);
  } catch (error) {
    console.error("getRouteSales error:", error);
    return [];
  }
}

export async function getRouteWhatsappUrl(routeId: string): Promise<string | null> {
  const route = await getRouteById(routeId);
  if (!route) return null;

  const sales = await getRouteSales(routeId);
  const message = buildDriverWhatsappMessage(route, sales);
  const phone = sanitizeWhatsappPhone(SINGLE_DELIVERY_DRIVER.phone);
  if (!phone) return null;

  return `https://wa.me/${phone}?text=${escapeWhatsAppText(message)}`;
}

export async function createRoute(payload: CreateRoutePayload): Promise<DeliveryRouteSummary> {
  const client = ensureClient();
  const { partnerId, branchId } = await getAuthContext();

  const insertData: Record<string, unknown> = {
    route_code: payload.routeCode,
    route_name: payload.routeName || null,
    route_type: payload.routeType || "standard",
    assigned_to: SINGLE_DELIVERY_DRIVER.name,
    driver_id: payload.driverId || null,
    branch_id: payload.branchId || branchId || null,
    delivery_date: payload.deliveryDate,
    departure_time: payload.departureTime || null,
    status: "pending",
  };

  if (partnerId) {
    insertData.partner_id = partnerId;
  }

  const { data, error } = await client
    .from("delivery_routes")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapRoute(data);
}

export async function getRoutesTodayCount(): Promise<number> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const routes = await getRoutes({ date: today, status: "all" });
    return routes.length;
  } catch {
    return 0;
  }
}
