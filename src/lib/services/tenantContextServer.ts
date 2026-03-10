// Funciones de servidor que usan cookies - NO importar desde componentes del cliente
import { cookies } from "next/headers";
import { getPosAccessScope } from "@/lib/services/authScopeService";
import type { TenantContext } from "@/lib/services/tenantContext";
import { getSelectedBranchCookieName } from "@/lib/services/tenantContext";

export async function getSelectedBranchId(userId: string): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieName = getSelectedBranchCookieName(userId);
  return cookieStore.get(cookieName)?.value ?? null;
}

export async function setSelectedBranchId(userId: string, branchId: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieName = getSelectedBranchCookieName(userId);
  const { COOKIE_MAX_AGE_SECONDS } = await import("@/lib/services/tenantContext");
  cookieStore.set(cookieName, branchId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearSelectedBranchId(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieName = getSelectedBranchCookieName(userId);
  cookieStore.delete(cookieName);
}

export async function getTenantContext(): Promise<TenantContext> {
  const scope = await getPosAccessScope();

  if (!scope?.userId) {
    throw new Error("No authenticated session");
  }

  const role = scope.role ?? "Admin";

  // Master Admin global sin partner_id
  if (role === "Admin" && !scope.partnerId) {
    return {
      type: "global",
      partnerId: null,
      branchId: null,
      userId: scope.userId,
      role,
    };
  }

  if (!scope.partnerId) {
    throw new Error("Tenant context missing partner_id");
  }

  const selectedBranchId = await getSelectedBranchId(scope.userId);
  const branchId = selectedBranchId ?? scope.branchId ?? null;

  return {
    type: "tenant",
    partnerId: scope.partnerId,
    branchId,
    userId: scope.userId,
    role,
  };
}
