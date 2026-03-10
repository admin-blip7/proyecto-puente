import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getSupabaseClientWithAuth } from "@/lib/supabaseClientWithAuth";

export type DeliveryFilter = {
  partnerId?: string | null;
  branchId?: string | null;
};

export const getDeliverySupabaseClient = async () => {
  if (typeof window === "undefined") {
    return getSupabaseServerClient();
  }

  const client = await getSupabaseClientWithAuth();
  if (!client) throw new Error("Supabase client not initialized");
  return client;
};

// Obtiene el scope de delivery usando solo metadata de auth (evita importar módulos con cookies)
export const getDeliveryScope = async (): Promise<DeliveryFilter> => {
  if (typeof window !== "undefined") {
    // Lado del cliente: usar metadata del auth
    const client = await getSupabaseClientWithAuth();
    if (!client) return { partnerId: null, branchId: null };
    const { data } = await client.auth.getSession();
    const partnerId = data?.session?.user?.user_metadata?.partner_id ?? null;
    const branchId = data?.session?.user?.user_metadata?.branch_id ?? null;
    return { partnerId, branchId };
  }

  // Lado del servidor: leer cookies directamente sin importar tenantQueryService
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  // Obtener partner_id y branch_id desde el token o metadata
  const token = cookieStore.get("tienda_admin_access_token")?.value;
  if (!token) return { partnerId: null, branchId: null };

  // Decodificar JWT para obtener metadata
  const decodeJwtPayload = (token: string): any | null => {
    try {
      const payload = token.split(".")[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch {
      return null;
    }
  };

  const payload = decodeJwtPayload(token);
  const metadata = payload?.user_metadata ?? {};
  const userId = payload?.sub || payload?.user_id;

  // Buscar selected_branch en cookie
  const selectedBranchId = userId
    ? cookieStore.get(`selected_branch_${userId}`)?.value
    : null;

  return {
    partnerId: metadata?.partner_id ?? null,
    branchId: (selectedBranchId ?? metadata?.branch_id) ?? null,
  };
};

export const applyDeliveryScope = <T extends { eq: (column: string, value: any) => T }>(
  query: T,
  scope: DeliveryFilter,
  withBranch = true
): T => {
  let q = query;
  if (scope.partnerId) {
    q = q.eq("partner_id", scope.partnerId);
  }
  if (withBranch && scope.branchId) {
    q = q.eq("branch_id", scope.branchId);
  }
  return q;
};

export const normalizeTime = (value?: string | null) => value || null;
