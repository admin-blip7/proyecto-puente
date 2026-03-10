"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, Phone, CheckCircle2 } from "lucide-react";
import DeliveryStatusBadge from "@/components/admin/delivery/DeliveryStatusBadge";

interface Props {
  stop: {
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
  onConfirm: () => void;
}

export default function MobileStopCard({ stop, onConfirm }: Props) {
  const destination = [stop.address, stop.city, stop.state].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

  return (
    <Card className="border-zinc-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500">Siguiente parada #{stop.stopSequence}</p>
            <p className="font-semibold text-zinc-900">{stop.customerName || "Cliente"}</p>
            <p className="text-sm text-zinc-700">{destination}</p>
            <p className="text-xs text-zinc-500 mt-1">Items: {stop.itemsCount ?? 0}</p>
          </div>
          <DeliveryStatusBadge status={stop.status} />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              <Navigation className="h-4 w-4 mr-2" /> Navegar
            </a>
          </Button>

          {stop.phone ? (
            <Button asChild variant="outline" className="w-full">
              <a href={`tel:${stop.phone}`}>
                <Phone className="h-4 w-4 mr-2" /> Llamar
              </a>
            </Button>
          ) : null}

          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onConfirm}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar entrega
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
