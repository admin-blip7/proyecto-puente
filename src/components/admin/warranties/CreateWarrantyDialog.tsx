"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Sale, Warranty } from "@/types";
import { addWarranty } from "@/lib/services/warrantyService";

interface CreateWarrantyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  onWarrantyCreated: (warranty: Warranty) => void;
}

const formSchema = z.object({
  productId: z.string().min(1, "Debe seleccionar un producto."),
  reason: z.string().min(10, "El motivo debe tener al menos 10 caracteres."),
});

export default function CreateWarrantyDialog({
  isOpen,
  onOpenChange,
  sale,
  onWarrantyCreated,
}: CreateWarrantyDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      reason: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const selectedItem = sale.items.find(item => item.productId === values.productId);
      if (!selectedItem) {
          toast({ variant: "destructive", title: "Error", description: "Producto no válido." });
          setLoading(false);
          return;
      }
        
      const newWarrantyData = {
        saleId: sale.saleId,
        productId: values.productId,
        productName: selectedItem.name,
        customerName: sale.customerName,
        customerPhone: sale.customerPhone,
        reason: values.reason,
      };

      const newWarranty = await addWarranty(newWarrantyData);
      onWarrantyCreated(newWarranty);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating warranty:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la garantía.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
      if (!open) {
          form.reset();
      }
      onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Garantía</DialogTitle>
          <DialogDescription>
            Seleccione un producto de la venta y describa el motivo de la garantía.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un producto..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sale.items.map((item) => (
                        <SelectItem key={item.productId} value={item.productId}>
                          {item.name}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de la Garantía</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: El producto dejó de funcionar después de una semana."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleDialogClose(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Registrando..." : "Crear Garantía"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
