"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeliveryItem } from "@/types";
import { getUndeliveredItems, updateItemDeliveryStatus } from "@/lib/services/deliveryItemService";
import DeliveryStatusBadge from "@/components/admin/delivery/DeliveryStatusBadge";
import { useToast } from "@/hooks/use-toast";

interface Props {
  routeId: string;
}

export default function UndeliveredItemsReport({ routeId }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getUndeliveredItems(routeId);
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [routeId]);

  const updateStatus = async (itemId: string, status: "returned" | "damaged") => {
    try {
      await updateItemDeliveryStatus(itemId, status);
      toast({ title: "Item actualizado", description: `Marcado como ${status}.` });
      await loadItems();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo actualizar", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items No Entregados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-zinc-500">Cargando...</p> : null}

        {!loading && items.length === 0 ? (
          <p className="text-sm text-zinc-600">No hay items pendientes/devolución en esta ruta.</p>
        ) : null}

        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{item.productName}</p>
              <p className="text-sm text-zinc-600">Cantidad: {item.quantity} | Entregada: {item.deliveredQuantity}</p>
              <DeliveryStatusBadge status={item.status} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "returned")}>Reagendar / Devolver</Button>
              <Button size="sm" variant="destructive" onClick={() => updateStatus(item.id, "damaged")}>Dañado</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
