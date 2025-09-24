"use client";

import { useState } from "react";
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
import { Sale, Warranty } from "@/types";
import { addWarranty } from "@/lib/services/warrantyService";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { XCircle } from "lucide-react";

interface CreateWarrantyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  onWarrantyCreated: (warranty: Warranty) => void;
}

const formSchema = z.object({
  productId: z.string().min(1, "Debe seleccionar un producto."),
  reason: z.string().min(10, "El motivo debe tener al menos 10 caracteres."),
  images: z.custom<FileList>().optional(),
});

export default function CreateWarrantyDialog({
  isOpen,
  onOpenChange,
  sale,
  onWarrantyCreated,
}: CreateWarrantyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: "",
      reason: "",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPreviews = Array.from(files).map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
      form.setValue("images", files);
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews(previews => previews.filter((_, i) => i !== index));
    const currentFiles = Array.from(form.getValues("images") || []);
    currentFiles.splice(index, 1);
    const dataTransfer = new DataTransfer();
    currentFiles.forEach(file => dataTransfer.items.add(file));
    form.setValue("images", dataTransfer.files);
  };


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
        customerName: sale.customerName || undefined,
        customerPhone: sale.customerPhone || undefined,
        reason: values.reason,
      };

      const imagesArray = values.images ? Array.from(values.images) : [];
      const newWarranty = await addWarranty(newWarrantyData, imagesArray);
      
      onWarrantyCreated(newWarranty);
      toast({
        title: "Garantía Registrada",
        description: `La garantía para "${selectedItem.name}" ha sido creada.`,
      });
      handleDialogClose(false);
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
          setImagePreviews([]);
      }
      onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Garantía</DialogTitle>
          <DialogDescription>
            Seleccione un producto, describa el motivo y adjunte imágenes si es necesario.
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

            <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Imágenes del Producto (Opcional)</FormLabel>
                        <FormControl>
                            <Input 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                onChange={handleImageChange}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {imagePreviews.map((src, index) => (
                  <div key={index} className="relative">
                    <Image src={src} alt={`Preview ${index}`} width={100} height={100} className="rounded-md object-cover w-full aspect-square" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => removeImage(index)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}


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
