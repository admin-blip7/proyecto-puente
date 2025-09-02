"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Product, Consignor, ownershipTypes, OwnershipType } from "@/types";
import { addProduct, getProducts } from "@/lib/services/productService";
import { getConsignors } from "@/lib/services/consignorService";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "../ui/command";
import { Badge } from "../ui/badge";
import { X, PlusCircle, Sparkles, Loader2 } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { suggestProductTags } from "@/ai/flows/suggest-product-tags";

interface AddProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: (product: Product) => void;
}

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  sku: z.string().min(1, "El SKU es requerido."),
  price: z.coerce.number().min(0, "El precio debe ser positivo."),
  cost: z.coerce.number().min(0, "El costo debe ser positivo."),
  stock: z.coerce.number().int().min(0, "El stock debe ser un número entero positivo."),
  reorderPoint: z.coerce.number().int().min(0, "El punto de reorden debe ser un número entero positivo.").optional(),
  category: z.string().min(1, "La categoría es requerida."),
  type: z.enum(["Venta", "Refacción"], { required_error: "Debe seleccionar un tipo."}),
  ownershipType: z.enum(ownershipTypes, { required_error: "Debe seleccionar un tipo de propiedad."}),
  consignorId: z.string().optional(),
  comboProductIds: z.array(z.string()).optional(),
  compatibilityTags: z.array(z.string()).optional(),
}).refine(data => {
    if (data.ownershipType === 'Familiar') {
        return data.price === data.cost;
    }
    return true;
}, {
    message: "Para productos 'Familiar', el precio y el costo deben ser iguales.",
    path: ['price'],
}).refine(data => {
    if (data.ownershipType === 'Consigna') {
        return !!data.consignorId;
    }
    return true;
}, {
    message: "Debe seleccionar un consignador para productos en consigna.",
    path: ['consignorId'],
});

export default function AddProductDialog({ isOpen, onOpenChange, onProductAdded }: AddProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [comboSearch, setComboSearch] = useState("");
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: 0,
      cost: 0,
      stock: 0,
      reorderPoint: 0,
      category: "",
      type: "Venta",
      ownershipType: "Propio",
      comboProductIds: [],
      compatibilityTags: [],
    },
  });

  const ownershipType = form.watch("ownershipType");
  const cost = form.watch("cost");
  const comboProductIds = form.watch("comboProductIds") || [];
  const compatibilityTags = form.watch("compatibilityTags") || [];
  
  const comboProducts = useMemo(() => {
    return allProducts.filter(p => comboProductIds.includes(p.id));
  }, [allProducts, comboProductIds]);

  const filteredComboOptions = useMemo(() => {
    return allProducts.filter(p => 
        !comboProductIds.includes(p.id) &&
        p.name.toLowerCase().includes(comboSearch.toLowerCase())
    );
  }, [allProducts, comboProductIds, comboSearch]);


  useEffect(() => {
    if (ownershipType === 'Familiar') {
      form.setValue('price', cost);
    }
  }, [cost, ownershipType, form]);

  useEffect(() => {
    if (isOpen) {
        getConsignors().then(setConsignors);
        getProducts().then(setAllProducts);
    } else {
        form.reset();
    }
  }, [isOpen, form]);

  const handleToggleComboProduct = (productId: string) => {
    const currentIds = form.getValues("comboProductIds") || [];
    const newIds = currentIds.includes(productId) 
        ? currentIds.filter(id => id !== productId)
        : [...currentIds, productId];
    form.setValue("comboProductIds", newIds);
  }

  const handleAddTag = useCallback(() => {
    if (tagInput.trim()) {
        const newTag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
        if (!compatibilityTags.includes(newTag)) {
            form.setValue("compatibilityTags", [...compatibilityTags, newTag]);
        }
        setTagInput("");
    }
  }, [tagInput, compatibilityTags, form]);

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue("compatibilityTags", compatibilityTags.filter(tag => tag !== tagToRemove));
  }
  
  const handleSuggestTags = async () => {
    const productName = form.getValues("name");
    if (!productName) {
        toast({ variant: 'destructive', title: 'Falta el nombre', description: 'Por favor, introduce un nombre de producto para obtener sugerencias.' });
        return;
    }
    setIsSuggestingTags(true);
    try {
        const existingProducts = allProducts.map(p => ({
            name: p.name,
            tags: p.compatibilityTags || [],
        }));
        const result = await suggestProductTags({
            productName,
            existingProducts,
        });

        const newTags = [...new Set([...compatibilityTags, ...result.suggestedTags])];
        form.setValue("compatibilityTags", newTags);
        toast({ title: 'Sugerencias de IA', description: 'Se han añadido nuevas etiquetas sugeridas.' });

    } catch (error) {
        console.error("Error suggesting tags:", error);
        toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudieron obtener las sugerencias.' });
    } finally {
        setIsSuggestingTags(false);
    }
  }


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const newProductData: Omit<Product, 'id' | 'createdAt'> = {
        ...values,
        reorderPoint: values.reorderPoint || 0,
        imageUrl: `https://picsum.photos/400/400?random=${Math.random()}`,
        consignorId: values.ownershipType === 'Consigna' ? values.consignorId : undefined,
        comboProductIds: values.comboProductIds || [],
        compatibilityTags: values.compatibilityTags || [],
      };
      const newProduct = await addProduct(newProductData);
      onProductAdded(newProduct);
      toast({
        title: "Producto Agregado",
        description: `El producto "${values.name}" ha sido agregado exitosamente.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar el producto.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Producto</DialogTitle>
          <DialogDescription>
            Complete los detalles para agregar un nuevo producto al inventario.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 py-4 pr-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-4">
                      <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Nombre del Producto</FormLabel>
                          <FormControl>
                              <Input placeholder="Ej: Coca-Cola 600ml" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>SKU (Código de Barras)</FormLabel>
                          <FormControl>
                              <Input placeholder="Ej: 7501055300075" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                          <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Precio de Venta</FormLabel>
                              <FormControl>
                                  <Input type="number" step="0.01" {...field} disabled={ownershipType === 'Familiar'} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                          <FormField
                          control={form.control}
                          name="cost"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Costo de Compra</FormLabel>
                              <FormControl>
                                  <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <FormField
                              control={form.control}
                              name="stock"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Stock Inicial</FormLabel>
                                  <FormControl>
                                      <Input type="number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                          <FormField
                              control={form.control}
                              name="reorderPoint"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Punto de Reorden</FormLabel>
                                  <FormControl>
                                      <Input type="number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                  </FormItem>
                              )}
                          />
                      </div>
                      <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Categoría</FormLabel>
                              <FormControl>
                                  <Input placeholder="Ej: Bebidas" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                       <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                              <FormItem className="space-y-3">
                              <FormLabel>Tipo de Producto</FormLabel>
                              <FormControl>
                                  <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex space-x-4"
                                  >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                      <RadioGroupItem value="Venta" />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                      Para Venta
                                      </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                      <RadioGroupItem value="Refacción" />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                      Para Reparación (Refacción)
                                      </FormLabel>
                                  </FormItem>
                                  </RadioGroup>
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
                  <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                      
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Etiquetas de Compatibilidad</h3>
                        <div className="flex gap-2">
                           <Input 
                                placeholder="Ej: iphone-15-pro"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                            />
                            <Button type="button" variant="outline" onClick={handleAddTag}>Añadir</Button>
                        </div>
                        <Button type="button" variant="secondary" className="w-full" onClick={handleSuggestTags} disabled={isSuggestingTags}>
                            {isSuggestingTags ? <Loader2 className="mr-2 animate-spin"/> : <Sparkles className="mr-2" />}
                            Sugerir con IA
                        </Button>
                        <div className="flex flex-wrap gap-2">
                            {compatibilityTags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-sm">
                                    {tag}
                                    <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20">
                                        <X className="h-3 w-3"/>
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-lg">Armar Combo</h3>
                      <p className="text-sm text-muted-foreground">Selecciona productos que se venderán comúnmente con este artículo.</p>
                      <Popover>
                          <PopoverTrigger asChild>
                               <Button variant="outline" className="w-full justify-start">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Añadir Producto al Combo
                                </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Buscar producto..." value={comboSearch} onValueChange={setComboSearch}/>
                                <CommandList>
                                    <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                    {filteredComboOptions.map(product => (
                                        <CommandItem key={product.id} onSelect={() => handleToggleComboProduct(product.id)}>
                                            {product.name}
                                        </CommandItem>
                                    ))}
                                </CommandList>
                            </Command>
                          </PopoverContent>
                      </Popover>
                      
                       <div className="space-y-2">
                            <FormLabel>Productos en el combo ({comboProducts.length})</FormLabel>
                            {comboProducts.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {comboProducts.map(p => (
                                        <Badge key={p.id} variant="secondary" className="text-sm">
                                            {p.name}
                                            <button type="button" onClick={() => handleToggleComboProduct(p.id)} className="ml-2 rounded-full p-0.5 hover:bg-destructive/20">
                                                <X className="h-3 w-3"/>
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No hay productos en el combo.</p>
                            )}
                       </div>
                    </div>
                  </div>
                </div>
                 <div className="pt-4 border-t">
                    <FormField
                        control={form.control}
                        name="ownershipType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Propiedad</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un tipo..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {ownershipTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    {ownershipType === 'Consigna' && (
                        <FormField
                            control={form.control}
                            name="consignorId"
                            render={({ field }) => (
                                <FormItem className="mt-4">
                                <FormLabel>Consignador</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un consignador..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {consignors.map(consignor => (
                                        <SelectItem key={consignor.id} value={consignor.id}>{consignor.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6 border-t mt-4">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                {loading ? "Agregando..." : "Agregar Producto"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
