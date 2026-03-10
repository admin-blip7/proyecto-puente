"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader } from "lucide-react";

interface DeviceDiagnostic {
  udid: string;
  model_name: string;
  model_id: string;
  serial_number: string;
  imei: string;
  imei2?: string;
  ios_version: string;
  storage_gb: number;
  icloud_locked: boolean;
  battery: {
    health_percent?: number | null;
    cycle_count?: number | null;
    full_charge_capacity?: number | null;
    design_capacity?: number | null;
    full_charge_mah?: number | null;
    design_mah?: number | null;
  };
}

interface Props {
  device: DeviceDiagnostic;
  open: boolean;
  onClose: () => void;
  onAdded: (productId: string, productName: string) => void;
}

export default function AddToInventoryModal({ device, open, onClose, onAdded }: Props) {
  const storageLabel = device.storage_gb ? ` ${device.storage_gb}GB` : "";
  const batLabel = device.battery?.health_percent
    ? ` | Bat. ${device.battery.health_percent}%`
    : "";
  const defaultSku = `IP-${device.serial_number?.slice(-6) ?? "000000"}`;

  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [ownershipType, setOwnershipType] = useState<"Propio" | "Consigna">("Propio");
  const [consignorId, setConsignorId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!price || !cost) {
      setError("Precio y costo son requeridos.");
      return;
    }
    if (ownershipType === "Consigna" && !consignorId.trim()) {
      setError("El consignatario es requerido para tipo Consigna.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/seminuevo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosticId: device.udid, // O device.id si el backend espera el UUID del diag record
          price: parseFloat(price),
          cost: parseFloat(cost),
          ownershipType,
          consignorId: consignorId || undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al agregar");

      onAdded(data.product.id, data.product.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar a Inventario</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
          <p className="font-semibold">{device.model_name}{storageLabel}{batLabel}</p>
          <p className="text-muted-foreground">Serial: {device.serial_number}</p>
          <p className="text-muted-foreground">IMEI: {device.imei}</p>
          {device.battery && (
            <p className="text-muted-foreground">
              Batería: {device.battery.health_percent}% &middot; {device.battery.cycle_count} ciclos
            </p>
          )}
          {device.icloud_locked && (
            <p className="text-red-500 font-medium">Bloqueado por iCloud</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Precio venta ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Costo ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Tipo de Propiedad</Label>
            <Select value={ownershipType} onValueChange={(v: any) => setOwnershipType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Propio">Propio</SelectItem>
                <SelectItem value="Consigna">Consigna</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {ownershipType === 'Consigna' && (
            <div className="space-y-1">
              <Label>Consignatario (ID o Referencia)</Label>
              <Input
                value={consignorId}
                onChange={(e) => setConsignorId(e.target.value)}
                placeholder="Ej. Juan Pérez"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Estado cosmético, detalles adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Agregar a Inventario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
