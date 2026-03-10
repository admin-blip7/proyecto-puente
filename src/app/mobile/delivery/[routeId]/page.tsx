"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getRouteById, getRouteSales, getRouteWhatsappUrl } from "@/lib/services/deliveryRouteService";
import { SINGLE_DELIVERY_DRIVER } from "@/lib/deliveryDriverConfig";
import { MessageCircle, RefreshCw, MapPin, Phone, Clock3, HandCoins } from "lucide-react";

export default function MobileDeliveryRoutePage() {
  const params = useParams();
  const routeId = String(params?.routeId || "");
  const [route, setRoute] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const routeData = await getRouteById(routeId);
      setRoute(routeData);
      if (routeData?.id) {
        const salesData = await getRouteSales(routeData.id);
        setSales(salesData);
      } else {
        setSales([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeId) {
      void load();
    } else {
      setLoading(false);
    }
  }, [routeId]);

  const totalToCollect = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Cargando ruta...</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen p-4">
        <Card>
          <CardHeader>
            <CardTitle>Ruta no encontrada</CardTitle>
            <CardDescription>No existe ruta con ID: {routeId}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 space-y-3">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>{route.routeCode}</CardTitle>
              <CardDescription>{route.routeName || "Ruta de entrega"}</CardDescription>
            </div>
            <Badge>{route.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Repartidor:</strong> {SINGLE_DELIVERY_DRIVER.name}</p>
          <p><strong>Fecha:</strong> {route.deliveryDate || "-"}</p>
          <p><strong>Hora salida:</strong> {route.departureTime || "No definida"}</p>
          <p><strong>Pedidos:</strong> {sales.length}</p>
          <p><strong>Total a cobrar:</strong> ${totalToCollect.toFixed(2)}</p>

          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              Actualizar
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
              {sending ? "Enviando..." : "Enviar por WhatsApp"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No hay entregas asignadas a esta ruta.
          </CardContent>
        </Card>
      ) : (
        sales.map((sale) => (
          <Card key={sale.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{sale.customerName}</CardTitle>
              <CardDescription>Venta: {sale.saleNumber}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-blue-600" />
                <span>{sale.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <span>{sale.customerPhone || "Sin teléfono"}</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-blue-600" />
                <span>{sale.deliveryTime || "Hora no definida"}</span>
              </p>
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <HandCoins className="h-4 w-4" />
                <span>Cobrar: ${Number(sale.totalAmount || 0).toFixed(2)}</span>
              </p>
              {sale.items?.length > 0 && (
                <div className="rounded-md border p-2 bg-white">
                  <p className="font-medium mb-1">Artículos</p>
                  <ul className="space-y-1">
                    {sale.items.map((item: any, index: number) => (
                      <li key={`${sale.id}-${index}`} className="text-sm">
                        {item.name} x{item.quantity} (${Number(item.priceAtSale || 0).toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
