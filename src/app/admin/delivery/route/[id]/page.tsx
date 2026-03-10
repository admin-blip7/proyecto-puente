"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Menu, MessageCircle, ExternalLink } from "lucide-react";
import { getRouteById, getRouteSales, getRouteWhatsappUrl } from "@/lib/services/deliveryRouteService";

export default function DeliveryRouteDetailPage() {
  const params = useParams();
  const routeId = String(params?.id || "");
  const [route, setRoute] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getRouteById(routeId);
        setRoute(data);
        if (data?.id) {
          const routeSales = await getRouteSales(data.id);
          setSales(routeSales);
        } else {
          setSales([]);
        }
      } finally {
        setLoading(false);
      }
    };
    if (routeId) {
      void load();
    } else {
      setLoading(false);
    }
  }, [routeId]);

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

      <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando ruta...</p>
        ) : !route ? (
          <Card>
            <CardHeader>
              <CardTitle>Ruta no encontrada</CardTitle>
              <CardDescription>No existe una ruta con ID: {routeId}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>{route.routeCode}</CardTitle>
                  <CardDescription>{route.routeName || "Sin nombre"}</CardDescription>
                </div>
                <Badge>{route.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="font-medium">Fecha:</span> {route.deliveryDate || "-"}</p>
              <p><span className="font-medium">Repartidor:</span> {route.assignedTo || "-"}</p>
              <p><span className="font-medium">Pedidos:</span> {route.totalOrders}</p>
              <p><span className="font-medium">Entregadas:</span> {route.totalDeliveries}</p>
              <p><span className="font-medium">Fallidas:</span> {route.totalFailedDeliveries}</p>
              <div className="pt-2 flex flex-wrap gap-2">
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
                  onClick={async () => {
                    setSending(true);
                    try {
                      const waUrl = await getRouteWhatsappUrl(route.id);
                      if (waUrl && typeof window !== "undefined") {
                        window.open(waUrl, "_blank", "noopener,noreferrer");
                      }
                    } finally {
                      setSending(false);
                    }
                  }}
                  disabled={sending}
                >
                  <MessageCircle className="mr-1 h-4 w-4" />
                  {sending ? "Enviando..." : "Enviar WhatsApp"}
                </Button>
              </div>

              <div className="pt-3 space-y-2">
                <p className="font-medium">Entregas de la ruta:</p>
                {sales.length === 0 ? (
                  <p className="text-muted-foreground">Sin entregas asignadas.</p>
                ) : (
                  sales.map((sale) => (
                    <div key={sale.id} className="rounded-md border p-2">
                      <p className="font-medium">{sale.customerName}</p>
                      <p>Dirección: {sale.address}</p>
                      <p>Cobrar: ${Number(sale.totalAmount || 0).toFixed(2)}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
