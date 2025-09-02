"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { RepairOrder } from "@/types";
import { addRepairOrder } from "@/lib/services/repairService";
import { Loader2 } from "lucide-react";

interface AddRepairDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderAdded: (order: RepairOrder) => void;
}

const formSchema = z.object({
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerPhone: z.string().min(1, "El teléfono es requerido."),
  deviceBrand: z.string().min(1, "La marca es requerida."),
  deviceModel: z.string().min(1, "El modelo es requerido."),
  deviceSerialIMEI: z.string().min(1, "El IMEI o Serie es requerido."),
  reportedIssue: z.string().min(10, "La descripción del problema debe tener al menos 10 caracteres."),
});

export default function AddRepairDialog({ isOpen, onOpenChange, onOrderAdded }: AddRepairDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deviceBrand: "",
      deviceModel: "",
      deviceSerialIMEI: "",
      reportedIssue: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const newOrder = await addRepairOrder(values);
      onOrderAdded(newOrder);
      toast({
        title: "Orden de Reparación Creada",
        description: `La orden #${newOrder.orderId} ha sido creada exitosamente.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding repair order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la orden de reparación.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Orden de Reparación</DialogTitle>
          <DialogDescription>
            Complete los detalles del cliente, el dispositivo y el problema reportado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre del Cliente</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej: Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Teléfono del Cliente</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej: 55 1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="deviceBrand"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Samsung" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="deviceModel"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: Galaxy S23" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="deviceSerialIMEI"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Serie / IMEI</FormLabel>
                        <FormControl>
                            <Input placeholder="15 dígitos" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="reportedIssue"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Problema Reportado por el Cliente</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Ej: La pantalla no enciende, se mojó..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
             />
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2"/> Creando...</> : "Crear Orden"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
