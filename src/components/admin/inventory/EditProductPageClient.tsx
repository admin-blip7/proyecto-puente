
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Product, Consignor, ownershipTypes } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { updateProduct } from "@/lib/services/productService";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ComboProductSelector from "./ComboProductSelector";


const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  sku: z.string().min(1, "El SKU es requerido."),
  price: z.coerce.number().min(0, "El precio debe ser positivo."),
  cost: z.coerce.number().min(0, "El costo debe ser positivo."),
  stock: z.coerce.number().int().min(0, "El stock debe ser un número entero positivo."),
  reorderPoint: z.coerce.number().int().min(0, "El punto de reorden debe ser un número entero positivo.").optional(),
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


interface EditProductPageClientProps {
  product: Product;
  consignors: Consignor[];
  allProducts: Product[];
}

export default function EditProductPageClient({ product, consignors, allProducts }: EditProductPageClientProps) {
  const [loading, setLoading] = useState(false);
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

  const { watch, formState: { isDirty } } = form;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("Intentando guardar cambios para el producto:", product.id);

    if (!isDirty) {
        toast({ title: "Sin cambios", description: "No has realizado ninguna modificación." });
        return;
    }

    setLoading(true);
    
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
    
    console.log("Datos a enviar:", dataToUpdate);

    try {
      await updateProduct(product.id, dataToUpdate);

      console.log("¡Éxito! Producto actualizado en Firestore.");
      
      toast({
        title: "Producto Actualizado",
        description: `El producto "${values.name}" ha sido guardado exitosamente.`,
      });
      
      router.push('/admin');
      router.refresh();

    } catch (error) {
      console.error("ERROR AL GUARDAR EN FIRESTORE:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo actualizar el producto. Revisa la consola para más detalles.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
        <header className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex justify-between items-center mb-4 pt-4">
              <Button asChild variant="outline" size="sm">
                  <Link href="/admin">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Volver
                  </Link>
              </Button>
              <h1 className="text-xl font-bold tracking-tight text-center">Editar Producto</h1>
              <Button type="submit" disabled={loading || !isDirty}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Cambios
              </Button>
          </div>
           <p className="text-muted-foreground text-center mb-4">{product.name}</p>
        </header>

        <Tabs defaultValue="general" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">Información General</TabsTrigger>
                <TabsTrigger value="pricing">Precios y Stock</TabsTrigger>
                <TabsTrigger value="classification">Clasificación</TabsTrigger>
                <TabsTrigger value="relations">Combos y Etiquetas</TabsTrigger>
            </TabsList>

            <div className="py-6 flex-1 overflow-y-auto">
                <TabsContent value="general">
                    <Card>
                        <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nombre del Producto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="sku" render={({ field }) => (
                                <FormItem><FormLabel>SKU (Código de Barras)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pricing">
                    <Card>
                        <CardHeader><CardTitle>Precios y Stock</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="cost" render={({ field }) => (
                                    <FormItem><FormLabel>Costo de Compra</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="price" render={({ field }) => (
                                    <FormItem><FormLabel>Precio de Venta</FormLabel><FormControl><Input type="number" step="0.01" {...field} disabled={watch('ownershipType') === 'Familiar'}/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="stock" render={({ field }) => (
                                    <FormItem><FormLabel>Stock Actual</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="reorderPoint" render={({ field }) => (
                                    <FormItem><FormLabel>Punto de Reorden</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="classification">
                    <Card>
                        <CardHeader><CardTitle>Clasificación del Producto</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <FormField control={form.control} name="type" render={({ field }) => (
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
                            )}/>
                             <FormField control={form.control} name="ownershipType" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Tipo de Propiedad</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>{ownershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            {watch('ownershipType') === 'Consigna' && (
                                <FormField control={form.control} name="consignorId" render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Consignador</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un consignador..." /></SelectTrigger></FormControl>
                                        <SelectContent>{consignors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="relations">
                    <Card>
                         <CardHeader>
                            <CardTitle>Combos y Etiquetas</CardTitle>
                            <CardDescription>Relaciona este producto con otros y añade etiquetas de compatibilidad.</CardDescription>
                         </CardHeader>
                        <CardContent className="space-y-8">
                             <ComboProductSelector form={form} allProducts={allProducts} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </div>
        </Tabs>
      </form>
    </Form>
  );
}
