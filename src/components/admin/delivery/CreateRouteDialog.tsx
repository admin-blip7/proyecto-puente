"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRoute } from "@/lib/services/deliveryRouteService";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Props {
  onCreated: () => void;
}

export default function CreateRouteDialog({ onCreated }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routeType, setRouteType] = useState<"standard" | "express" | "pickup">("standard");

  const defaultRouteCode = useMemo(() => {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    return `RUTA-${date}-${String(Math.floor(Math.random() * 90) + 10)}`;
  }, [open]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      await createRoute({
        routeCode: String(formData.get("routeCode") || defaultRouteCode),
        routeName: String(formData.get("routeName") || ""),
        routeType,
        assignedTo: String(formData.get("assignedTo") || ""),
        driverId: String(formData.get("driverId") || ""),
        branchId: String(formData.get("branchId") || ""),
        deliveryDate: String(formData.get("deliveryDate") || new Date().toISOString().split("T")[0]),
        departureTime: String(formData.get("departureTime") || ""),
      });

      toast({ title: "Ruta creada", description: "La ruta se registró correctamente." });
      setOpen(false);
      onCreated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo crear la ruta", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Nueva Ruta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>Crear Ruta de Entrega</DialogTitle>
        </DialogHeader>

        <form
          action={async (fd) => {
            await handleSubmit(fd);
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="routeCode">Código</Label>
            <Input id="routeCode" name="routeCode" defaultValue={defaultRouteCode} required />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="routeName">Nombre de Ruta</Label>
            <Input id="routeName" name="routeName" placeholder="Ruta Centro - Norte" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Fecha de entrega</Label>
            <Input id="deliveryDate" name="deliveryDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="departureTime">Hora de salida</Label>
            <Input id="departureTime" name="departureTime" type="time" />
          </div>

          <div className="space-y-2">
            <Label>Tipo de ruta</Label>
            <Select value={routeType} onValueChange={(v: any) => setRouteType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Estándar</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="pickup">Recolección</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Repartidor</Label>
            <Input id="assignedTo" name="assignedTo" placeholder="Juan Pérez" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driverId">Driver ID (opcional)</Label>
            <Input id="driverId" name="driverId" placeholder="UUID" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Sucursal (opcional)</Label>
            <Input id="branchId" name="branchId" placeholder="UUID" />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="bg-black text-white" disabled={loading}>
              {loading ? "Creando..." : "Crear ruta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
