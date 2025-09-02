"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Repair } from "@/types";
import { updateRepair } from "@/lib/services/repairService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EditRepairDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  repair: Repair;
  onRepairUpdated: (repair: Repair) => void;
}

const repairStatuses: Repair['status'][] = ['Ingresado', 'En Diagnóstico', 'Esperando Refacción', 'Reparado', 'Listo para Entrega', 'Entregado'];

const formSchema = z.object({
  status: z.enum(repairStatuses),
  cost: z.coerce.number().min(0, "El costo debe ser positivo."),
  technicianNotes: z.string().optional(),
});

export default function EditRepairDialog({
  isOpen,
  onOpenChange,
  repair,
  onRepairUpdated,
}: EditRepairDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: repair.status,
      cost: repair.cost,
      technicianNotes: repair.technicianNotes || "",
    },
  });
  
  useEffect(() => {
    form.reset({
      status: repair.status,
      cost: repair.cost,
      technicianNotes: repair.technicianNotes || "",
    })
  }, [repair, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        const dataToUpdate: Partial<Repair> = {
            status: values.status,
            cost: values.cost,
            technicianNotes: values.technicianNotes
        };
        
        await updateRepair(repair.id, dataToUpdate);

        const updatedRepair = { ...repair, ...dataToUpdate };
        onRepairUpdated(updatedRepair);

        toast({
            title: "Reparación Actualizada",
            description: "El estado de la reparación ha sido actualizado.",
        });

        onOpenChange(false);
    } catch (error) {
      console.error("Error updating repair:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la reparación.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalles de la Reparación</DialogTitle>
          <DialogDescription>
            Actualiza el estado, costo y notas de la orden de servicio.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-6 py-4 space-y-4">
            <div className="space-y-4">
                <div><p className="text-sm font-medium text-muted-foreground">Cliente</p><p className="font-semibold">{repair.customerName} ({repair.customerPhone})</p></div>
                <div><p className="text-sm font-medium text-muted-foreground">Dispositivo</p><p className="font-semibold">{repair.deviceModel} (IMEI: {repair.deviceImei})</p></div>
                <div><p className="text-sm font-medium text-muted-foreground">Fecha de Ingreso</p><p className="font-semibold">{format(repair.createdAt, "dd MMM yyyy, HH:mm", { locale: es })}</p></div>
                <div><p className="text-sm font-medium text-muted-foreground">Falla Reportada</p><p className="text-sm bg-muted p-2 rounded-md">{repair.reportedIssue}</p></div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de la Reparación</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {repairStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="cost" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Costo Total de la Reparación</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>

                <FormField control={form.control} name="technicianNotes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas del Técnico</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ej: Se reemplazó la pantalla y se limpiaron los componentes internos..." className="resize-y" rows={4} {...field}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                )}/>
                 <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Actualizando..." : "Guardar Cambios"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
