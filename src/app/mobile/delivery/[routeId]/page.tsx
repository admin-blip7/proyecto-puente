"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import MobileStopCard from "@/components/mobile/delivery/MobileStopCard";
import PhotoCapture from "@/components/mobile/delivery/PhotoCapture";
import SignatureCanvas from "@/components/mobile/delivery/SignatureCanvas";
import { getRouteManifest } from "@/lib/services/deliveryRouteService";
import { recordDeliveryConfirmation, updateStopStatus } from "@/lib/services/deliveryStopService";
import {
  enqueueOfflineConfirmation,
  getOfflineConfirmations,
  removeOfflineConfirmation,
} from "@/lib/services/deliveryOfflineService";
import { notifyRouteAssigned, requestPushPermission } from "@/lib/services/deliveryPushService";
import { useToast } from "@/hooks/use-toast";

export default function MobileDeliveryPage() {
  const params = useParams();
  const routeId = String(params?.routeId || "");
  const { toast } = useToast();

  const [route, setRoute] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string>("");
  const [photo, setPhoto] = useState("");
  const [signature, setSignature] = useState("");
  const [offlineCount, setOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    try {
      const manifest = await getRouteManifest(routeId);
      setRoute(manifest.route);
      setStops(manifest.stops || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!routeId) return;
    void load();
    setOfflineCount(getOfflineConfirmations().filter((c) => c.routeId === routeId).length);
    void requestPushPermission();
  }, [routeId]);

  useEffect(() => {
    if (route?.routeCode) {
      void notifyRouteAssigned(route.routeCode);
    }
  }, [route?.routeCode]);

  const nextStop = useMemo(
    () => stops.find((s) => !["completed", "skipped"].includes(s.status)) || stops[0],
    [stops]
  );

  const confirmStop = async () => {
    if (!selectedStopId || !photo) {
      toast({ title: "Faltan datos", description: "Selecciona parada y foto de evidencia.", variant: "destructive" });
      return;
    }

    try {
      await recordDeliveryConfirmation(selectedStopId, {
        photoUrl: photo,
        notes: signature ? "Firma capturada" : "Entrega confirmada",
      });
      await updateStopStatus(selectedStopId, "completed");
      toast({ title: "Entrega confirmada" });
      setPhoto("");
      setSignature("");
      await load();
    } catch (error: any) {
      const pending = enqueueOfflineConfirmation({
        routeId,
        stopId: selectedStopId,
        photoUrl: photo,
        signature,
        notes: "Pendiente de sincronización",
      });
      setOfflineCount(pending);
      toast({
        title: "Guardado offline",
        description: "Sin conexión o error de red. La confirmación quedó en cola para sincronizar.",
      });
    }
  };

  const syncOffline = async () => {
    if (syncing) return;
    setSyncing(true);
    const queue = getOfflineConfirmations().filter((item) => item.routeId === routeId);
    if (!queue.length) {
      toast({ title: "Sin pendientes", description: "No hay confirmaciones por sincronizar." });
      setSyncing(false);
      return;
    }

    let synced = 0;
    for (const item of queue) {
      try {
        await recordDeliveryConfirmation(item.stopId, {
          photoUrl: item.photoUrl,
          notes: item.signature ? "Firma capturada (offline sync)" : "Sync offline",
        });
        await updateStopStatus(item.stopId, "completed");
        removeOfflineConfirmation(item.id);
        synced += 1;
      } catch {
        // keep item in queue
      }
    }

    const remaining = getOfflineConfirmations().filter((c) => c.routeId === routeId).length;
    setOfflineCount(remaining);
    await load();
    toast({
      title: "Sincronización finalizada",
      description: `Sincronizadas: ${synced}. Pendientes: ${remaining}.`,
    });
    setSyncing(false);
  };

  useEffect(() => {
    const onOnline = () => {
      void syncOffline();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [routeId, syncing]);

  if (!route) {
    return <div className="min-h-screen bg-zinc-50 p-4"><p className="text-sm text-zinc-500">Cargando ruta...</p></div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ruta móvil: {route.routeCode}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-700">
          <p>Repartidor: {route.assignedTo || "Sin asignar"}</p>
          <p>Paradas: {stops.length}</p>
          <p>Pendientes offline: {offlineCount}</p>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={syncOffline} disabled={syncing}>
              {syncing ? "Sincronizando..." : "Sincronizar pendientes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {nextStop ? (
        <MobileStopCard
          stop={{
            id: nextStop.id,
            stopSequence: nextStop.stop_sequence,
            customerName: nextStop.customer_name,
            address: nextStop.address,
            city: nextStop.city,
            state: nextStop.state,
            phone: nextStop.phone,
            status: nextStop.status,
            itemsCount: (nextStop.delivery_items || []).length,
          }}
          onConfirm={() => setSelectedStopId(nextStop.id)}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PhotoCapture value={photo} onChange={setPhoto} />
          <SignatureCanvas onChange={setSignature} />
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmStop}>
            Guardar confirmación de entrega
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Lista de paradas</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stops.map((stop) => (
            <button
              key={stop.id}
              className="w-full text-left border rounded-md p-3 text-sm bg-white"
              onClick={() => setSelectedStopId(stop.id)}
            >
              <p className="font-medium">#{stop.stop_sequence} {stop.customer_name || "Cliente"}</p>
              <p className="text-zinc-600">{[stop.address, stop.city, stop.state].filter(Boolean).join(", ")}</p>
              <p className="text-xs text-zinc-500">Estado: {stop.status}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
