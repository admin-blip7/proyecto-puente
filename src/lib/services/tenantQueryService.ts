import { getTenantContext } from "@/lib/services/tenantContextServer";
import type { TenantContext } from "@/lib/services/tenantContext";

// Re-exportar el tipo para compatibilidad
export type { TenantContext };

export const resolveTenantContext = async () => getTenantContext();

export const isTenantScoped = (
  context: Awaited<ReturnType<typeof getTenantContext>>
) => context.type === "tenant";

export const getTenantPartnerId = (
  context: Awaited<ReturnType<typeof getTenantContext>>
) => (context.type === "tenant" ? context.partnerId : null);

export const getTenantBranchId = (
  context: Awaited<ReturnType<typeof getTenantContext>>
) => (context.type === "tenant" ? context.branchId : null);
