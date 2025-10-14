"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { BulkUpdateData, Product } from "@/types";
import { bulkUpdateProducts } from "@/lib/services/productService";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "../ui/badge";
import { X } from "lucide-react";
import { Label } from "../ui/label";

interface BulkEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onProductsUpdated: () => void;
}

const formSchema = z.object({
  priceMode: z.enum(["none", "fixed", "amount", "percent"]).default("none"),
  priceValue: z.coerce.number().optional(),
  costMode: z.enum(["none", "fixed", "amount", "percent"]).default("none"),
  costValue: z.coerce.number().optional(),
  tagsToAdd: z.array(z.string()).optional(),
  tagsToRemove: z.array(z.string()).optional(),
});

export default function BulkEditDialog({
  isOpen,
  onOpenChange,
  productIds,
  onProductsUpdated,
}: BulkEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [removeTagInput, setRemoveTagInput] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      priceMode: "none",
      costMode: "none",
      tagsToAdd: [],
      tagsToRemove: [],
    },
  });

  const handleAddTag = () => {
    if (tagInput.trim() !== "") {
      const currentTags = form.getValues("tagsToAdd") || [];
      form.setValue("tagsToAdd", [...currentTags, tagInput.trim().toLowerCase()]);
      setTagInput("");
    }
  };

  const handleRemoveTagFromForm = (tag: string) => {
    const currentTags = form.getValues("tagsToAdd") || [];
    form.setValue("tagsToAdd", currentTags.filter(t => t !== tag));
  }

  const handleAddRemoveTag = () => {
    if (removeTagInput.trim() !== "") {
      const currentTags = form.getValues("tagsToRemove") || [];
      form.setValue("tagsToRemove", [...currentTags, removeTagInput.trim().toLowerCase()]);
      setRemoveTagInput("");
    }
  }

  const handleRemoveRemoveTagFromForm = (tag: string) => {
    const currentTags = form.getValues("tagsToRemove") || [];
    form.setValue("tagsToRemove", currentTags.filter(t => t !== tag));
  }

  const numProducts = productIds.length;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        let updateData: BulkUpdateData = {};
        
        if (values.priceMode !== 'none' && values.priceValue !== undefined) {
            updateData.price = { mode: values.priceMode, value: values.priceValue };
        }
        if (values.costMode !== 'none' && values.costValue !== undefined) {
            updateData.cost = { mode: values.costMode, value: values.costValue };
        }
        if (values.tagsToAdd && values.tagsToAdd.length > 0) {
            updateData.tagsToAdd = values.tagsToAdd;
        }
        if (values.tagsToRemove && values.tagsToRemove.length > 0) {
            updateData.tagsToRemove = values.tagsToRemove;
        }

        if (Object.keys(updateData).length === 0) {
            toast({ variant: "destructive", title: "Sin cambios", description: "No se especificó ninguna operación de edición." });
            setLoading(false);
            return;
        }

        await bulkUpdateProducts(productIds, updateData);
        onProductsUpdated();
        toast({
            title: "Edición Masiva Exitosa",
            description: `${numProducts} producto(s) ha(n) sido actualizado(s).`,
        });
        onOpenChange(false);
    } catch (error) {
      console.error("Error in bulk edit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron actualizar los productos.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = (open: boolean) => {
    if (!open) {
      form.reset();
      setTagInput("");
      setRemoveTagInput("");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edición Masiva de Productos</DialogTitle>
          <DialogDescription>
            Aplicar cambios a <span className="font-bold">{numProducts} producto(s)</span> seleccionados. 
            Los campos que dejes vacíos o en &quot;ninguno&quot; no se modificarán.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="prices">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prices">Precios y Costos</TabsTrigger>
                <TabsTrigger value="tags">Etiquetas</TabsTrigger>
              </TabsList>
              <TabsContent value="prices" className="py-4 space-y-6">
                {/* Price Section */}
                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="font-medium">Precio de Venta</h3>
                  <FormField
                    control={form.control}
                    name="priceMode"
                    render={({ field }) => (
                      <FormItem>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fixed" id="price-fixed" />
                              <Label htmlFor="price-fixed">Establecer Valor Fijo</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="amount" id="price-amount" />
                              <Label htmlFor="price-amount">Ajustar por Monto (+/-)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="percent" id="price-percent" />
                              <Label htmlFor="price-percent">Ajustar por %</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="none" id="price-none" />
                              <Label htmlFor="price-none">Sin Cambios</Label>
                            </div>
                        </RadioGroup>
                      </FormItem>
                    )}
                  />
                  {form.watch("priceMode") !== 'none' && (
                    <FormField
                      control={form.control}
                      name="priceValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor para Precio</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                 {/* Cost Section */}
                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="font-medium">Costo de Compra</h3>
                    <FormField
                    control={form.control}
                    name="costMode"
                    render={({ field }) => (
                      <FormItem>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fixed" id="cost-fixed" />
                              <Label htmlFor="cost-fixed">Establecer Valor Fijo</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="amount" id="cost-amount" />
                              <Label htmlFor="cost-amount">Ajustar por Monto (+/-)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="percent" id="cost-percent" />
                              <Label htmlFor="cost-percent">Ajustar por %</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="none" id="cost-none" />
                              <Label htmlFor="cost-none">Sin Cambios</Label>
                            </div>
                        </RadioGroup>
                      </FormItem>
                    )}
                  />
                  {form.watch("costMode") !== 'none' && (
                    <FormField
                      control={form.control}
                      name="costValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor para Costo</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="tags" className="py-4 space-y-6">
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">Añadir Etiquetas</h3>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Escribe una etiqueta y presiona enter..."
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}}
                        />
                        <Button type="button" onClick={handleAddTag}>Añadir</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(form.watch("tagsToAdd") || []).map(tag => (
                            <Badge key={tag} variant="secondary">
                                {tag}
                                <button type="button" onClick={() => handleRemoveTagFromForm(tag)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20">
                                    <X className="h-3 w-3"/>
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-medium">Eliminar Etiquetas</h3>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="Escribe una etiqueta a eliminar y presiona enter..."
                            value={removeTagInput}
                            onChange={(e) => setRemoveTagInput(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddRemoveTag(); }}}
                        />
                        <Button type="button" variant="destructive" onClick={handleAddRemoveTag}>Añadir a la lista</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                         {(form.watch("tagsToRemove") || []).map(tag => (
                            <Badge key={tag} variant="destructive">
                                {tag}
                                <button type="button" onClick={() => handleRemoveRemoveTagFromForm(tag)} className="ml-2 rounded-full p-0.5 hover:bg-white/20">
                                    <X className="h-3 w-3"/>
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter className="pt-6 border-t mt-4">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2"/> Aplicando...</> : "Aplicar Cambios"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
