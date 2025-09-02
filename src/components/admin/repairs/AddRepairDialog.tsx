"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Repair } from "@/types";
import { addRepair } from "@/lib/services/repairService";

interface AddRepairDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRepairAdded: (repair: Repair) => void;
}

const commonIssues = [
  "Pantalla Rota",
  "Batería no carga / dura poco",
  "Problemas de software / No enciende",
  "Daño por líquido",
  "Puerto de carga dañado",
  "Problemas de audio (micrófono/altavoz)",
  "Problemas de cámara",
  "Otro (describir abajo)",
];

const formSchema = z.object({
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerPhone: z.string().min(1, "El teléfono es requerido."),
  deviceModel: z.string().min(1, "El modelo es requerido."),
  deviceImei: z.string().min(1, "El IMEI o número de serie es requerido."),
  reportedIssue: z.string().min(1, "Debe seleccionar o describir la falla."),
  issueDescription: z.string().optional(),
}).refine(data => data.reportedIssue !== 'Otro (describir abajo)' || (data.issueDescription && data.issueDescription.length > 0), {
    message: "Debe describir la falla si selecciona 'Otro'.",
    path: ["issueDescription"],
});


export default function AddRepairDialog({ isOpen, onOpenChange, onRepairAdded }: AddRepairDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deviceModel: "",
      deviceImei: "",
      reportedIssue: "",
      issueDescription: "",
    },
  });
  
  const selectedIssue = form.watch("reportedIssue");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const finalIssue = values.reportedIssue === "Otro (describir abajo)" ? values.issueDescription! : values.reportedIssue;
      
      const newRepairData = {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        deviceModel: values.deviceModel,
        deviceImei: values.deviceImei,
        reportedIssue: finalIssue,
      };

      const newRepair = await addRepair(newRepairData);
      onRepairAdded(newRepair);
      
      toast({
        title: "Reparación Registrada",
        description: `Se ha creado la orden de servicio para ${values.deviceModel}.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding repair:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la reparación.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Reparación</DialogTitle>
          <DialogDescription>
            Complete los detalles para crear una nueva orden de servicio.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="customerName" render={({ field }) => ( <FormItem> <FormLabel>Nombre del Cliente</FormLabel> <FormControl> <Input placeholder="Juan Pérez" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="customerPhone" render={({ field }) => ( <FormItem> <FormLabel>Teléfono</FormLabel> <FormControl> <Input placeholder="555-123-4567" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="deviceModel" render={({ field }) => ( <FormItem> <FormLabel>Modelo del Dispositivo</FormLabel> <FormControl> <Input placeholder="iPhone 14 Pro" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                <FormField control={form.control} name="deviceImei" render={({ field }) => ( <FormItem> <FormLabel>IMEI / Serie</FormLabel> <FormControl> <Input placeholder="15 dígitos" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
            </div>
            <FormField
              control={form.control}
              name="reportedIssue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Falla Común Reportada</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una falla..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {commonIssues.map((issue) => ( <SelectItem key={issue} value={issue}>{issue}</SelectItem> ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedIssue === 'Otro (describir abajo)' && (
                <FormField
                    control={form.control}
                    name="issueDescription"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Descripción de la Falla</FormLabel>
                        <FormControl><Textarea placeholder="El cliente menciona que el teléfono se mojó y ya no prende..." {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "Registrando..." : "Crear Orden"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
