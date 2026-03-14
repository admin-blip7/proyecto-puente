import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import { getProductCategories } from "@/lib/services/categoryService";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getWholesaleProfitSettings } from "@/lib/services/wholesaleProfitService";
import WholesaleConfigClient from "./WholesaleConfigClient";

const ADMIN_ACCESS_TOKEN_COOKIE = "tienda_admin_access_token";

export const dynamic = "force-dynamic";

const resolveRole = (user: User | null): string => {
  if (!user) return "";

  const metadataRole = String(user.user_metadata?.role ?? "").toLowerCase();
  const appRole = String(user.app_metadata?.role ?? "").toLowerCase();
  const normalizedRole = metadataRole || appRole;

  if (normalizedRole === "master admin") {
    return "admin";
  }

  // Default to "admin" if no role is explicitly set (matches client-side AuthProvider behavior)
  return normalizedRole || "admin";
};

const resolveUpdatedBy = (user: User): string => {
  return String(
    user.user_metadata?.name ??
      user.user_metadata?.full_name ??
      user.email ??
      "Admin"
  );
};

export default async function MayoreoConfigPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    redirect("/pos");
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user || resolveRole(user) !== "admin") {
    redirect("/pos");
  }

  const [initialSettings, initialCategories] = await Promise.all([
    getWholesaleProfitSettings(),
    getProductCategories(),
  ]);

  return (
    <AdminPageLayout title="Configuración Mayoreo">
        <WholesaleConfigClient
          initialCategories={initialCategories}
          initialSettings={initialSettings}
          updatedBy={resolveUpdatedBy(user)}
        />
    </AdminPageLayout>
  );
}
