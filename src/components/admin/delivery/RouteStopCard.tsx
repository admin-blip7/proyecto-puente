"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Navigation, CheckCircle2, MessageCircle } from "lucide-react";
import DeliveryStatusBadge from "@/components/admin/delivery/DeliveryStatusBadge";

type Stop = {
  id: string;
  stopSequence: number;
  customerName?: string;
  address: string;
  city?: string;
  state?: string;
  phone?: string;
  status: string;
  itemsCount?: number;
};

interface Props {
  stop: Stop;
  onConfirm?: (stopId: string) => void;
}

export default function RouteStopCard({ stop, onConfirm }: Props) {
  const destination = [stop.address, stop.city, stop.state].filter(Boolean).join(", ");
  const mapsUrl = `https://www.mapbox.com/search/?query=${encodeURIComponent(destination)}`;

  return (
    <Card className="border-zinc-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">Parada #{stop.stopSequence}</p>
            <h4 className="font-semibold text-zinc-900">{stop.customerName || "Cliente"}</h4>
            <p className="text-sm text-zinc-700">{[stop.address, stop.city, stop.state].filter(Boolean).join(", ")}</p>
          </div>
          <DeliveryStatusBadge status={stop.status} />
        </div>

        <div className="text-sm text-zinc-600">
          <span className="font-medium">Items:</span> {stop.itemsCount ?? 0}
        </div>

        <div className="flex flex-wrap gap-2">
          {stop.phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${stop.phone}`}>
                <Phone className="h-4 w-4 mr-1" /> Llamar
              </a>
            </Button>
          )}

          {stop.phone && (
            <Button asChild size="sm" variant="outline">
              <a
                href={`https://wa.me/${stop.phone.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(
                  "Hola, estamos en ruta para tu entrega."
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
              </a>
            </Button>
          )}

          <Button asChild size="sm" variant="outline">
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              <Navigation className="h-4 w-4 mr-1" /> Ver mapa
            </a>
          </Button>

          {onConfirm && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onConfirm(stop.id)}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
