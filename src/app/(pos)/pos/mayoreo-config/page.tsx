import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Menu } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  // Default to "admin" if no role is explicitly set (matches client-side AuthProvider behavior)
  return metadataRole || appRole || "admin";
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
    <div className="flex h-screen w-full bg-background">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>
      <div className="absolute left-4 top-4 z-50 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-24 p-0">
            <SheetTitle className="sr-only">Mayoreo Menu</SheetTitle>
            <LeftSidebar />
          </SheetContent>
        </Sheet>
      </div>
      <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
        <WholesaleConfigClient
          initialCategories={initialCategories}
          initialSettings={initialSettings}
          updatedBy={resolveUpdatedBy(user)}
        />
      </main>
    </div>
  );
}
