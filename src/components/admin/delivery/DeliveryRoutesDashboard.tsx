"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRoute, DeliveryRouteSummary, getRouteWhatsappUrl, getRoutes } from "@/lib/services/deliveryRouteService";
import { RefreshCw, Plus, Truck, Calendar, UserRound, Package, MessageCircle, ExternalLink } from "lucide-react";
import { SINGLE_DELIVERY_DRIVER } from "@/lib/deliveryDriverConfig";

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En ruta",
  completed: "Completada",
  cancelled: "Cancelada",
};

const statusClass: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  in_progress: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelled: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

export default function DeliveryRoutesDashboard() {
  const [routes, setRoutes] = useState<DeliveryRouteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed" | "cancelled">("all");

  const [routeCode, setRouteCode] = useState("");
  const [routeName, setRouteName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split("T")[0]);
  const [departureTime, setDepartureTime] = useState("");
  const [sendingRouteId, setSendingRouteId] = useState<string | null>(null);

  const loadRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoutes({
        date: dateFilter || undefined,
        status: statusFilter,
      });
      setRoutes(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar las rutas.");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoutes();
  }, [dateFilter, statusFilter]);

  const metrics = useMemo(() => {
    const total = routes.length;
    const pending = routes.filter((r) => r.status === "pending").length;
    const inProgress = routes.filter((r) => r.status === "in_progress").length;
    const completed = routes.filter((r) => r.status === "completed").length;
    return { total, pending, inProgress, completed };
  }, [routes]);

  const resetCreateForm = () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    setRouteCode(`RUTA-${today}-${String(Math.floor(Math.random() * 900) + 100)}`);
    setRouteName("");
    setDeliveryDate(today);
    setDepartureTime("");
  };

  useEffect(() => {
    if (openCreate) {
      resetCreateForm();
    }
  }, [openCreate]);

  const handleCreateRoute = async () => {
    if (!routeCode.trim() || !deliveryDate) return;
    setCreating(true);
    setError(null);
    try {
      await createRoute({
        routeCode: routeCode.trim(),
        routeName: routeName.trim() || undefined,
        deliveryDate,
        departureTime: departureTime || undefined,
      });
      setOpenCreate(false);
      await loadRoutes();
    } catch (err: any) {
      setError(err?.message || "No se pudo crear la ruta.");
    } finally {
      setCreating(false);
    }
  };

  const handleSendRouteWhatsapp = async (routeId: string) => {
    setSendingRouteId(routeId);
    try {
      const waUrl = await getRouteWhatsappUrl(routeId);
      if (!waUrl) {
        setError("No se pudo generar el enlace de WhatsApp para la ruta seleccionada.");
        return;
      }
      if (typeof window !== "undefined") {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar por WhatsApp.");
    } finally {
      setSendingRouteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Rutas y Entregas
              </CardTitle>
              <CardDescription>
                Gestión diaria de rutas con repartidor único: <strong>{SINGLE_DELIVERY_DRIVER.name}</strong>.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void loadRoutes()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva ruta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear ruta</DialogTitle>
                    <DialogDescription>Registra una nueva ruta de entrega para la fecha seleccionada.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="routeCode">Código de ruta</Label>
                      <Input id="routeCode" value={routeCode} onChange={(e) => setRouteCode(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="routeName">Nombre</Label>
                      <Input id="routeName" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Ruta Centro Norte" />
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                      <p className="font-medium text-blue-900">Repartidor asignado</p>
                      <p className="text-blue-700">{SINGLE_DELIVERY_DRIVER.name}</p>
                      <p className="text-xs text-blue-600 mt-1">WhatsApp: {SINGLE_DELIVERY_DRIVER.phone}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="deliveryDate">Fecha</Label>
                        <Input id="deliveryDate" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="departureTime">Salida</Label>
                        <Input id="departureTime" type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>
                      Cancelar
                    </Button>
                    <Button onClick={() => void handleCreateRoute()} disabled={creating || !routeCode.trim() || !deliveryDate}>
                      {creating ? "Creando..." : "Crear ruta"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.total}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pendientes</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.pending}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">En ruta</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.inProgress}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Completadas</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{metrics.completed}</CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Fecha</Label>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_progress">En ruta</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado de rutas</CardTitle>
          <CardDescription>{loading ? "Cargando..." : `${routes.length} ruta(s) encontradas`}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando rutas...</div>
          ) : routes.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay rutas para los filtros seleccionados.</div>
          ) : (
            <div className="space-y-2">
              {routes.map((route) => (
                <div key={route.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{route.routeCode}</p>
                      <p className="text-sm text-muted-foreground">{route.routeName || "Sin nombre"}</p>
                    </div>
                    <Badge className={statusClass[route.status] || "bg-zinc-100 text-zinc-700"}>
                      {statusLabel[route.status] || route.status}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {route.deliveryDate || "Sin fecha"}
                    </div>
                    <div className="flex items-center gap-1">
                      <UserRound className="h-4 w-4" />
                      {route.assignedTo || "Sin repartidor"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      Pedidos: {route.totalOrders}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.open(`/mobile/delivery/${route.id}`, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Página del repartidor
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleSendRouteWhatsapp(route.id)}
                      disabled={sendingRouteId === route.id}
                    >
                      <MessageCircle className="mr-1 h-4 w-4" />
                      {sendingRouteId === route.id ? "Enviando..." : "Enviar por WhatsApp"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
