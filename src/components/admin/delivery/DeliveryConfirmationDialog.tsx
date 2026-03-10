"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordDeliveryConfirmation, updateStopStatus } from "@/lib/services/deliveryStopService";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

interface Props {
  stopId: string;
  onConfirmed?: () => void;
}

export default function DeliveryConfirmationDialog({ stopId, onConfirmed }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (formData: FormData) => {
    setLoading(true);
    try {
      const photoUrl = String(formData.get("photoUrl") || "");
      const notes = String(formData.get("notes") || "");

      if (!photoUrl) {
        throw new Error("La foto de entrega es obligatoria");
      }

      await recordDeliveryConfirmation(stopId, {
        photoUrl,
        notes,
      });

      await updateStopStatus(stopId, "completed");

      toast({ title: "Entrega confirmada", description: "Se registró la evidencia de entrega." });
      setOpen(false);
      onConfirmed?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo confirmar la entrega.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar Entrega
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirmación de Entrega</DialogTitle>
        </DialogHeader>

        <form
          action={async (fd) => {
            await handleConfirm(fd);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="photoUrl">Foto de entrega (URL)</Label>
            <Input id="photoUrl" name="photoUrl" placeholder="https://..." required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientName">Nombre de quien recibe</Label>
            <Input id="recipientName" name="recipientName" placeholder="Nombre completo" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" placeholder="Incidencias o comentario de entrega" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-black text-white">
              {loading ? "Guardando..." : "Guardar confirmación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
