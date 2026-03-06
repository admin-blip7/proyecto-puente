"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getRoutes } from "@/lib/services/deliveryRouteService";
import DeliveryStatusBadge from "@/components/admin/delivery/DeliveryStatusBadge";
import CreateRouteDialog from "@/components/admin/delivery/CreateRouteDialog";

export default function DeliveryRoutesDashboard() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("all");
  const [driverId, setDriverId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const result = await getRoutes({ date, status: status as any, driverId: driverId || undefined });
      setRoutes(result);
    } catch (error) {
      console.error(error);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoutes();
  }, [date, status, driverId]);

  const metrics = useMemo(() => {
    const active = routes.filter((r) => r.status === "in_progress").length;
    const pending = routes.filter((r) => r.status === "pending").length;
    const completed = routes.filter((r) => r.status === "completed").length;
    return { active, pending, completed };
  }, [routes]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-amber-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Operación logística</p>
            <h1 className="text-2xl font-semibold text-zinc-900">Rutas y Entregas</h1>
            <p className="text-sm text-zinc-600">Control diario de rutas, paradas y evidencias de entrega.</p>
          </div>
          <CreateRouteDialog onCreated={loadRoutes} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardHeader><CardTitle className="text-sm">Rutas activas</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{metrics.active}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Pendientes</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{metrics.pending}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Completadas hoy</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{metrics.completed}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="in_progress">En curso</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Driver ID (opcional)" value={driverId} onChange={(e) => setDriverId(e.target.value)} />
          <Button variant="outline" onClick={loadRoutes}>Refrescar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rutas del día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-zinc-500">Cargando rutas...</p> : null}
          {!loading && routes.length === 0 ? <p className="text-sm text-zinc-500">No hay rutas para los filtros seleccionados.</p> : null}

          {routes.map((route) => {
            const progress = route.totalOrders > 0 ? Math.round((route.totalDeliveries / route.totalOrders) * 100) : 0;
            return (
              <div key={route.id} className="border rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{route.routeCode}</h3>
                    <DeliveryStatusBadge status={route.status} />
                  </div>
                  <p className="text-sm text-zinc-600">{route.routeName || "Sin nombre"}</p>
                  <p className="text-sm text-zinc-600">Repartidor: {route.assignedTo || "Sin asignar"}</p>
                </div>

                <div className="text-sm text-zinc-700 grid grid-cols-2 gap-x-4 gap-y-1">
                  <p>Pedidos: {route.totalOrders}</p>
                  <p>Monto: ${route.totalAmount}</p>
                  <p>Entregadas: {route.totalDeliveries}</p>
                  <p>Progreso: {progress}%</p>
                </div>

                <Button asChild className="bg-black text-white hover:bg-zinc-900">
                  <Link href={`/admin/delivery/route/${route.id}`}>Ver detalle</Link>
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
