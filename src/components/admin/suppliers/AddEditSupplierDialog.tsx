"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Supplier } from "@/types";
import { addSupplier, updateSupplier, getSupplierById } from "@/lib/services/supplierService";
import { Loader2 } from "lucide-react";
import { getLogger } from "@/lib/logger";
const log = getLogger("AddEditSupplierDialog");

const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100, "El nombre es muy largo"),
  contactInfo: z.string().min(1, "La información de contacto es requerida").max(200, "La información de contacto es muy larga"),
  notes: z.string().max(500, "Las notas son muy largas").optional().default("")
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface AddEditSupplierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierSaved: (supplier: Supplier) => void;
  supplier?: Supplier;
}

export default function AddEditSupplierDialog({
  isOpen,
  onClose,
  onSupplierSaved,
  supplier
}: AddEditSupplierDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isEditing = !!supplier;

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name || "",
      contactInfo: supplier?.contactInfo || "",
      notes: supplier?.notes || ""
    }
  });

  const onSubmit = async (data: SupplierFormData) => {
    try {
      setLoading(true);

      if (isEditing && supplier) {
        // Actualizar proveedor existente
        await updateSupplier(supplier.id, data);
        const updatedSupplier = await getSupplierById(supplier.id);
        if (updatedSupplier) {
          onSupplierSaved(updatedSupplier);
        }
      } else {
        // Crear nuevo proveedor
        const supplierId = await addSupplier(data);
        const newSupplier = await getSupplierById(supplierId);
        if (newSupplier) {
          onSupplierSaved(newSupplier);
        }
      }

      form.reset();
      onClose();
    } catch (error) {
      log.error("Error saving supplier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Error al ${isEditing ? 'actualizar' : 'crear'} el proveedor.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Proveedor" : "Agregar Nuevo Proveedor"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Actualiza la información del proveedor." 
              : "Completa los datos para agregar un nuevo proveedor."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Proveedor *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Distribuidora ABC S.A."
                      {...field}
                      disabled={loading}
                    />
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
                  <FormLabel>Información de Contacto *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Teléfono, email, dirección..."
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre el proveedor..."
                      rows={3}
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar" : "Agregar"} Proveedor
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}