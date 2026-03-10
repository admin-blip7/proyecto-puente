"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getRouteById, getRouteManifest, optimizeRoute, startRoute, completeRoute } from "@/lib/services/deliveryRouteService";
import {
  generateDriverManifest,
  generateReturnManifest,
  generateRouteManifest,
  blobToDataUrl,
} from "@/lib/services/deliveryManifestService";
import RouteStopCard from "@/components/admin/delivery/RouteStopCard";
import DeliveryStatusBadge from "@/components/admin/delivery/DeliveryStatusBadge";
import DeliveryConfirmationDialog from "@/components/admin/delivery/DeliveryConfirmationDialog";
import UndeliveredItemsReport from "@/components/admin/delivery/UndeliveredItemsReport";
import DeliveryQrBadge from "@/components/admin/delivery/DeliveryQrBadge";
import { useToast } from "@/hooks/use-toast";

interface Props {
  routeId: string;
}

export default function RouteDetailPanel({ routeId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [routeData, manifestData] = await Promise.all([
        getRouteById(routeId),
        getRouteManifest(routeId),
      ]);
      setRoute(routeData);
      setManifest(manifestData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo cargar la ruta", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [routeId]);

  const completionRate = useMemo(() => {
    const stops = manifest?.stops || [];
    if (!stops.length) return 0;
    const completed = stops.filter((s: any) => s.status === "completed").length;
    return Math.round((completed / stops.length) * 100);
  }, [manifest]);

  const openBlob = async (blob: Blob) => {
    const dataUrl = await blobToDataUrl(blob);
    window.open(dataUrl, "_blank");
  };

  const handlePrintDriver = async () => {
    try {
      await openBlob(await generateDriverManifest(routeId));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo generar el manifiesto", variant: "destructive" });
    }
  };

  const handlePrintFull = async () => {
    try {
      await openBlob(await generateRouteManifest(routeId));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo generar el manifiesto completo", variant: "destructive" });
    }
  };

  const handlePrintReturns = async () => {
    try {
      await openBlob(await generateReturnManifest(routeId));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo generar el manifiesto de devoluciones", variant: "destructive" });
    }
  };

  const onOptimize = async () => {
    await optimizeRoute(routeId);
    toast({ title: "Ruta optimizada", description: "Se reordenaron las paradas." });
    await loadData();
  };

  const onStart = async () => {
    await startRoute(routeId);
    toast({ title: "Ruta iniciada" });
    await loadData();
  };

  const onComplete = async () => {
    await completeRoute(routeId);
    toast({ title: "Ruta completada" });
    await loadData();
  };

  if (loading) return <p className="text-sm text-zinc-500">Cargando detalle de ruta...</p>;
  if (!route) return <p className="text-sm text-zinc-500">No se encontró la ruta.</p>;

  const stops = manifest?.stops || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{route.routeCode} {route.routeName ? `- ${route.routeName}` : ""}</span>
            <DeliveryStatusBadge status={route.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-zinc-500">Repartidor:</span> {route.assignedTo || "Sin asignar"}</div>
            <div><span className="text-zinc-500">Fecha:</span> {new Date(route.deliveryDate).toLocaleDateString()}</div>
            <div><span className="text-zinc-500">Paradas:</span> {stops.length}</div>
            <div><span className="text-zinc-500">Progreso:</span> {completionRate}%</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onOptimize}>Optimizar</Button>
            <Button variant="outline" onClick={handlePrintFull}>Imprimir manifiesto</Button>
            <Button variant="outline" onClick={handlePrintDriver}>Copia repartidor</Button>
            <Button variant="outline" onClick={handlePrintReturns}>Devoluciones</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onStart}>Iniciar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onComplete}>Completar</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="stops" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="stops">Paradas</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="manifest">Manifiesto</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-2 text-sm text-zinc-700">
              <p><span className="font-medium">Total pedidos:</span> {route.totalOrders}</p>
              <p><span className="font-medium">Entregas:</span> {route.totalDeliveries}</p>
              <p><span className="font-medium">Fallidas:</span> {route.totalFailedDeliveries}</p>
              <p><span className="font-medium">Monto:</span> ${route.totalAmount}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stops" className="space-y-3">
          {stops.length > 0 ? (
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-zinc-600 mb-2">Mapa de referencia de la ruta</p>
                <div className="rounded-md border p-3 bg-zinc-50">
                  <p className="text-sm text-zinc-700 mb-2">
                    Abre la ruta en Mapbox para navegación y revisión de paradas.
                  </p>
                  <Button asChild variant="outline">
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.mapbox.com/search/?query=${encodeURIComponent(
                        [stops[0]?.address, stops[0]?.city, stops[0]?.state].filter(Boolean).join(", ")
                      )}`}
                    >
                      Abrir en Mapbox
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {stops.map((stop: any) => (
              <div key={stop.id} className="space-y-2">
                <RouteStopCard
                  stop={{
                    id: stop.id,
                    stopSequence: stop.stop_sequence,
                    customerName: stop.customer_name,
                    address: stop.address,
                    city: stop.city,
                    state: stop.state,
                    phone: stop.phone,
                    status: stop.status,
                    itemsCount: (stop.delivery_items || []).length,
                  }}
                />
                <DeliveryConfirmationDialog stopId={stop.id} onConfirmed={loadData} />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-3">
          <UndeliveredItemsReport routeId={routeId} />
        </TabsContent>

        <TabsContent value="manifest" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-sm text-zinc-700">Vista rápida del manifiesto de ruta:</p>
              {stops.map((stop: any) => (
                <div key={stop.id} className="border rounded-md p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">#{stop.stop_sequence} - {stop.customer_name || "Cliente"}</p>
                      <p className="text-zinc-600">{[stop.address, stop.city, stop.state].filter(Boolean).join(", ")}</p>
                    </div>
                    <DeliveryQrBadge
                      value={JSON.stringify({
                        routeId,
                        routeCode: route.routeCode,
                        stopId: stop.id,
                        stopSequence: stop.stop_sequence,
                        customer: stop.customer_name || "Cliente",
                      })}
                      size={84}
                    />
                  </div>
                  <ul className="list-disc pl-5 mt-1 text-zinc-700">
                    {(stop.delivery_items || []).map((item: any) => (
                      <li key={item.id}>{item.product_name} x{item.quantity} ({item.status})</li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
