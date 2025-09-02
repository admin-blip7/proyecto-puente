 "use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Consignor } from "@/types";
import { addConsignor, updateConsignorInfo } from "@/lib/services/consignorService";
import { Loader2 } from "lucide-react";

interface AddEditConsignorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  consignor: Consignor | null;
  onConsignorAdded: (consignor: Consignor) => void;
  onConsignorUpdated: (consignor: Consignor) => void;
}

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  contactInfo: z.string().min(5, "La información de contacto es requerida."),
});

export default function AddEditConsignorDialog({ 
    isOpen, 
    onOpenChange, 
    consignor,
    onConsignorAdded,
    onConsignorUpdated 
}: AddEditConsignorDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const isEditMode = !!consignor;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        form.reset({
            name: consignor.name,
            contactInfo: consignor.contactInfo,
        });
      } else {
        form.reset({
            name: "",
            contactInfo: "",
        });
      }
    }
  }, [isOpen, consignor, isEditMode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      if (isEditMode) {
        await updateConsignorInfo(consignor.id, values);
        onConsignorUpdated({ ...consignor, ...values });
        toast({ title: "Consignador Actualizado", description: "La información ha sido guardada." });
      } else {
        const newConsignor = await addConsignor(values);
        onConsignorAdded(newConsignor);
        toast({ title: "Consignador Agregado", description: "El nuevo consignador ha sido creado." });
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error processing consignor:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: isEditMode ? "No se pudo actualizar el consignador." : "No se pudo agregar el consignador.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Consignador" : "Agregar Nuevo Consignador"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles del consignador." : "Completa la información del nuevo consignador."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Consignador</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Ropa Americana S.A." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Información de Contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: juan.perez@email.com o 5512345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2"/> Guardando...</> : (isEditMode ? "Guardar Cambios" : "Agregar Consignador")}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
