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
import { X, PlusCircle, Sparkles, Loader2, UploadCloud } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { suggestProductTags } from "@/ai/flows/suggest-product-tags";
import Image from "next/image";

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
  image: z.custom<FileList>().optional(),
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
  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [comboSearch, setComboSearch] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    },
  });

  const ownershipType = form.watch("ownershipType");
  const cost = form.watch("cost");
  const comboProductIds = form.watch("comboProductIds") || [];
  
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
        setImagePreview(null);
    }
  }, [isOpen, form]);
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
        setImagePreview(null);
    }
  };

  const handleToggleComboProduct = (productId: string) => {
    const currentIds = form.getValues("comboProductIds") || [];
    const newIds = currentIds.includes(productId) 
        ? currentIds.filter(id => id !== productId)
        : [...currentIds, productId];
    form.setValue("comboProductIds", newIds);
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const newProductData: Omit<Product, 'id' | 'createdAt' | 'imageUrl'> = {
        name: values.name,
        sku: values.sku,
        price: values.price,
        cost: values.cost,
        stock: values.stock,
        category: values.category,
        type: values.type,
        ownershipType: values.ownershipType,
        reorderPoint: values.reorderPoint || 0,
        consignorId: values.ownershipType === 'Consigna' ? values.consignorId : undefined,
        comboProductIds: values.comboProductIds || [],
        compatibilityTags: [], // Tags will be generated automatically
      };
      
      const imageFile = values.image?.[0];

      const newProduct = await addProduct(newProductData, imageFile);

      onProductAdded(newProduct);
      toast({
        title: "Producto Agregado",
        description: `El producto "${values.name}" ha sido agregado.`,
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
                     {/* Image Upload Section */}
                    <div className="space-y-2">
                        <FormLabel>Imagen del Producto</FormLabel>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted">
                                {imagePreview ? (
                                    <Image src={imagePreview} alt="Vista previa" width={140} height={140} className="object-contain h-full" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click para subir</span> o arrastra</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG (MAX. 2MB)</p>
                                    </div>
                                )}
                                <FormField
                                    control={form.control}
                                    name="image"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input 
                                                    id="dropzone-file" 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/png, image/jpeg"
                                                    onChange={(e) => {
                                                        field.onChange(e.target.files);
                                                        handleImageChange(e);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </label>
                        </div> 
                    </div>

                    <div className="space-y-4">
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
