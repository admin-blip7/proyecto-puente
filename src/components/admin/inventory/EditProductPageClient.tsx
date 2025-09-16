"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Product, Consignor, ownershipTypes, OwnershipType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { updateProduct } from "@/lib/services/productService";
import { Loader2, Save, Package, DollarSign, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import ComboProductSelector from "./ComboProductSelector";


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

type Section = "general" | "pricing" | "details";

interface EditProductPageClientProps {
  product: Product;
  consignors: Consignor[];
  allProducts: Product[];
}

export default function EditProductPageClient({ product, consignors, allProducts }: EditProductPageClientProps) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("general");
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...product,
      reorderPoint: product.reorderPoint || 0,
      comboProductIds: product.comboProductIds || [],
    },
  });

  const { watch, setValue, getValues, formState: { isDirty } } = form;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!isDirty) {
        toast({ title: "Sin cambios", description: "No has realizado ninguna modificación." });
        return;
    }

    setLoading(true);
    try {
      let dataToUpdate: Partial<Product> = {};
      const formKeys = Object.keys(values) as (keyof typeof values)[];
      
      formKeys.forEach(key => {
        if (JSON.stringify(values[key]) !== JSON.stringify(product[key as keyof Product])) {
            (dataToUpdate as any)[key] = values[key];
        }
      });
      
      if(product.ownershipType === 'Consigna' && values.ownershipType !== 'Consigna') {
          (dataToUpdate as any).consignorId = null;
      }
      
      await updateProduct(product.id, dataToUpdate);

      toast({
        title: "Producto Actualizado",
        description: `El producto "${values.name}" ha sido guardado exitosamente.`,
      });
      router.push('/admin');

    } catch (error) {
      console.error("ERROR CAPTURADO (actualizando producto):", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el producto.",
      });
    } finally {
      setLoading(false);
    }
  };

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'Información General', icon: Info },
    { id: 'pricing', label: 'Precios y Stock', icon: DollarSign },
    { id: 'details', label: 'Categorías y Tipos', icon: Package },
  ];

  return (
    <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Editar Producto</h1>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={loading || !isDirty}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
            </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 flex-1">
            <aside className="md:col-span-1">
                <nav className="flex flex-col space-y-2">
                    {navItems.map(item => (
                        <Button 
                            key={item.id}
                            variant={activeSection === item.id ? 'default' : 'ghost'}
                            className="justify-start"
                            onClick={() => setActiveSection(item.id)}
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.label}
                        </Button>
                    ))}
                </nav>
            </aside>
            <main className="md:col-span-3">
                 <Form {...form}>
                    <form className="space-y-6">
                        {activeSection === 'general' && (
                             <div className="space-y-4">
                                <FormField
                                    control={form.control} name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Nombre del Producto</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control} name="sku"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>SKU (Código de Barras)</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {activeSection === 'pricing' && (
                             <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control} name="price"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Precio de Venta</FormLabel>
                                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control} name="cost"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Costo de Compra</FormLabel>
                                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control} name="stock"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Stock Actual</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control} name="reorderPoint"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Punto de Reorden</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {activeSection === 'details' && (
                             <div className="space-y-4">
                                <FormField
                                    control={form.control} name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Categoría</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control} name="type"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                        <FormLabel>Tipo de Producto</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Venta" /></FormControl><FormLabel className="font-normal">Para Venta</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Refacción" /></FormControl><FormLabel className="font-normal">Refacción</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control} name="ownershipType"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Tipo de Propiedad</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>{ownershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {watch('ownershipType') === 'Consigna' && (
                                    <FormField
                                        control={form.control} name="consignorId"
                                        render={({ field }) => (
                                            <FormItem className="mt-4">
                                            <FormLabel>Consignador</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger></FormControl>
                                                <SelectContent>{consignors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <ComboProductSelector form={form} allProducts={allProducts} />
                            </div>
                        )}
                    </form>
                 </Form>
            </main>
        </div>
    </div>
  );
}
