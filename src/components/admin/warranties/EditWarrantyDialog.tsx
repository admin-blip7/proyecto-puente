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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Warranty } from "@/types";
import { updateWarranty } from "@/lib/services/warrantyService";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/appPreferences";

interface EditWarrantyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  warranty: Warranty;
  onWarrantyUpdated: (warranty: Warranty) => void;
}

const formSchema = z.object({
  status: z.enum(['Pendiente', 'En Revisión', 'Resuelta', 'Rechazada']),
  resolutionDetails: z.string().optional(),
});

const warrantyStatuses: Warranty['status'][] = ['Pendiente', 'En Revisión', 'Resuelta', 'Rechazada'];


export default function EditWarrantyDialog({
  isOpen,
  onOpenChange,
  warranty,
  onWarrantyUpdated,
}: EditWarrantyDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: warranty.status,
      resolutionDetails: warranty.resolutionDetails || "",
    },
  });
  
  useEffect(() => {
    form.reset({
      status: warranty.status,
      resolutionDetails: warranty.resolutionDetails || "",
    })
  }, [warranty, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        const dataToUpdate: Partial<Warranty> = {};
        if (values.status !== warranty.status) {
            dataToUpdate.status = values.status;
        }
        if (values.resolutionDetails && values.resolutionDetails !== warranty.resolutionDetails) {
            dataToUpdate.resolutionDetails = values.resolutionDetails;
        }

        if (Object.keys(dataToUpdate).length === 0) {
            toast({ title: "Sin cambios", description: "No se ha realizado ninguna modificación." });
            onOpenChange(false);
            return;
        }

        await updateWarranty(warranty.id, dataToUpdate);

        const updatedWarranty = { ...warranty, ...dataToUpdate };
        onWarrantyUpdated(updatedWarranty);

        toast({
            title: "Garantía Actualizada",
            description: "El estado de la garantía ha sido actualizado.",
        });

        onOpenChange(false);
    } catch (error) {
      console.error("Error updating warranty:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la garantía.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles de la Garantía</DialogTitle>
          <DialogDescription>
            Revisa la información, actualiza el estado y añade una resolución.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="pr-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Producto</p>
                        <p className="font-semibold">{warranty.productName}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                        <p className="font-semibold">{warranty.customerName || 'N/A'}</p>
                        <p className="text-sm">{warranty.customerPhone}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Fecha de Reporte</p>
                        <p className="font-semibold">{format(warranty.reportedAt, "dd MMM yyyy, HH:mm", { locale: getDateFnsLocale() })}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Motivo de la Garantía</p>
                        <p className="text-sm bg-muted p-2 rounded-md">{warranty.reason}</p>
                    </div>
                </div>
                <div>
                     <p className="text-sm font-medium text-muted-foreground mb-2">Imágenes Adjuntas</p>
                     {warranty.imageUrls && warranty.imageUrls.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {warranty.imageUrls.map((url, index) => (
                                <a href={url} target="_blank" rel="noopener noreferrer" key={index}>
                                    <Image src={url} alt={`Imagen de garantía ${index + 1}`} width={150} height={150} className="rounded-md object-cover w-full aspect-square border hover:opacity-80 transition-opacity" />
                                </a>
                            ))}
                        </div>
                     ) : (
                        <p className="text-sm text-center italic text-muted-foreground bg-muted p-4 rounded-md">No se adjuntaron imágenes.</p>
                     )}
                </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado de la Garantía</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warrantyStatuses.map((status) => (
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

                <FormField
                  control={form.control}
                  name="resolutionDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detalles de la Resolución</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe la solución o el motivo del rechazo..."
                          className="resize-y"
                          rows={4}
                          {...field}
                        />
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
