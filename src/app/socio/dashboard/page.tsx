"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks";
import { useBranch } from "@/contexts/BranchContext";
import { getRoutesTodayCount } from "@/lib/services/deliveryRouteService";
import {
  Menu,
  Building2,
  Store,
  Truck,
  BarChart3,
  Package,
  RefreshCw,
} from "lucide-react";

export default function SocioDashboardPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const { selectedBranch, availableBranches, isLoading } = useBranch();
  const [routesToday, setRoutesToday] = useState(0);
  const [routesLoading, setRoutesLoading] = useState(false);

  const isSocio = userProfile?.role === "Socio";

  const loadRoutesToday = async () => {
    setRoutesLoading(true);
    try {
      const count = await getRoutesTodayCount();
      setRoutesToday(count);
    } catch {
      setRoutesToday(0);
    } finally {
      setRoutesLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !userProfile) {
      router.replace("/login");
    }
  }, [loading, userProfile, router]);

  useEffect(() => {
    void loadRoutesToday();
  }, []);

  const roleLabel = useMemo(() => {
    if (!userProfile?.role) return "Sin rol";
    return userProfile.role;
  }, [userProfile?.role]);

  if (loading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando dashboard de socio...</p>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-row">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>

      <div className="absolute top-4 left-4 z-50 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px] border-r-0">
            <SheetTitle className="sr-only">Socio menu</SheetTitle>
            <LeftSidebar />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pl-10 md:pl-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard Socio</h1>
            <p className="text-sm text-muted-foreground">
              Vista operativa de sucursales, inventario y logística.
            </p>
          </div>
          <Badge variant={isSocio ? "default" : "secondary"}>{roleLabel}</Badge>
        </div>

        {!isSocio && (
          <Card className="border-amber-300 bg-amber-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rol de socio no detectado</CardTitle>
              <CardDescription>
                Tu usuario no tiene rol `Socio`; puedes ver esta página, pero algunas acciones de sucursal
                podrían no aplicar a tu cuenta.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sucursal activa</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Store className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{selectedBranch?.name || "Sin seleccionar"}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sucursales disponibles</CardTitle>
            </CardHeader>
            <CardContent className="font-semibold text-2xl">{availableBranches.length}</CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rutas hoy</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="font-semibold text-2xl">{routesToday}</span>
              <Button variant="ghost" size="icon" onClick={() => void loadRoutesToday()} disabled={routesLoading}>
                <RefreshCw className={`h-4 w-4 ${routesLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Partner ID</CardTitle>
            </CardHeader>
            <CardContent className="text-xs font-mono break-all">
              {userProfile.partnerId || "No asignado"}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
            <CardDescription>Atajos operativos para el flujo de socio.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/socio/seleccionar-sucursal")}>
              <Building2 className="mr-2 h-4 w-4" />
              Cambiar sucursal
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin")}>
              <Package className="mr-2 h-4 w-4" />
              Ver inventario
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/delivery/routes")}>
              <Truck className="mr-2 h-4 w-4" />
              Rutas y entregas
            </Button>
            <Button variant="outline" onClick={() => router.push("/admin/delivery/reports")}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Reportes de entregas
            </Button>
            <Button onClick={() => router.push("/pos")}>
              <Store className="mr-2 h-4 w-4" />
              Abrir POS
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sucursales de la cuenta</CardTitle>
            <CardDescription>
              Selección rápida de sucursal para esta sesión.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {availableBranches.length > 0 ? (
              availableBranches.map((branch) => (
                <Button
                  key={branch.id}
                  size="sm"
                  variant={selectedBranch?.id === branch.id ? "default" : "outline"}
                  onClick={() => router.push("/socio/seleccionar-sucursal")}
                >
                  {branch.name}
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay sucursales disponibles para esta cuenta.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
