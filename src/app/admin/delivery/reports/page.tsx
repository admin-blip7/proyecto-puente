"use client";

import { useEffect, useMemo, useState } from "react";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Menu, RefreshCw } from "lucide-react";
import { getRoutes } from "@/lib/services/deliveryRouteService";

export default function DeliveryReportsPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRoutes({ status: "all" });
      setRoutes(data);
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => {
    const total = routes.length;
    const completed = routes.filter((r) => r.status === "completed").length;
    const inProgress = routes.filter((r) => r.status === "in_progress").length;
    const pending = routes.filter((r) => r.status === "pending").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, pending, completionRate };
  }, [routes]);

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
            <SheetTitle className="sr-only">Delivery Menu</SheetTitle>
            <LeftSidebar />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12 space-y-4">
        <div className="flex items-center justify-between pl-10 md:pl-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reportes de Entregas</h1>
            <p className="text-sm text-muted-foreground">Indicadores operativos de rutas.</p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Rutas</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.total}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Completadas</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.completed}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">En ruta</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.inProgress}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pendientes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.pending}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">% Cumplimiento</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.completionRate}%</CardContent></Card>
        </div>
      </main>
    </div>
  );
}
