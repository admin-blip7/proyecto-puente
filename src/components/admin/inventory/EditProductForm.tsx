
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Consignor, ownershipTypes } from "@/types";
import { updateProduct } from "@/lib/services/productService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ComboProductSelector from "./ComboProductSelector";
import CategoryAttributes, { productCategories } from "./CategoryAttributes";
import CurrencyInput from "@/components/ui/currency-input";
import { getLogger } from "@/lib/logger";
const log = getLogger("EditProductForm");

interface EditProductFormProps {
  product: Product;
  consignors: Consignor[];
  allProducts: Product[];
}

export default function EditProductForm({ product, consignors, allProducts }: EditProductFormProps) {
  const [formData, setFormData] = useState<Product>({
    ...product,
    attributes: product.attributes || {},
    category: product.category || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setFormData({
      ...product,
      attributes: product.attributes || {},
      category: product.category || '',
    });
  }, [product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: string | number = value;
    if (type === 'number') {
        processedValue = value === '' ? '' : Number(value);
    }

    setFormData(prevData => ({ ...prevData, [name]: processedValue }));
  };
  
  const handleSelectChange = (name: keyof Product, value: string) => {
    const updatedFormData = { ...formData, [name]: value };
     if (name === 'ownershipType' && value === 'Familiar') {
      updatedFormData.price = updatedFormData.cost;
    }
     if (name === 'ownershipType' && value !== 'Consigna') {
      updatedFormData.consignorId = undefined;
    }
    // Si cambia la categoría, limpiar los atributos
    if (name === 'category') {
      updatedFormData.attributes = {};
    }
    setFormData(updatedFormData);
  };
  
   const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCost = Number(e.target.value);
    setFormData(prevData => {
        const newData = { ...prevData, cost: newCost };
        if (newData.ownershipType === 'Familiar') {
            newData.price = newCost;
        }
        return newData;
    });
   };

  const handleSaveChanges = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    log.info("Guardando datos:", formData);

    try {
      await updateProduct(product.id, formData);
      
      log.info("¡Éxito! Producto actualizado.");
      toast({
        title: "Producto Actualizado",
        description: `El producto "${formData.name}" ha sido guardado exitosamente.`,
      });
      
      router.push('/admin');
      router.refresh();

    } catch (error) {
      log.error("ERROR AL GUARDAR:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: "No se pudo actualizar el producto. Revisa la consola para más detalles.",
      });
     } finally {
       setIsLoading(false);
     }
   };
  
  const formMethodsForSelector = {
    watch: (fieldName: keyof Product) => formData[fieldName],
    setValue: (fieldName: keyof Product, value: any) => {
      setFormData(prev => ({...prev, [fieldName]: value}));
    },
    getValues: (fieldName: keyof Product) => formData[fieldName],
  };


  return (
    <form onSubmit={handleSaveChanges} className="h-full flex flex-col">
      <header className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4 pt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-center">Editar Producto</h1>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
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
                <div>
                  <Label htmlFor="name">Nombre del Producto</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                </div>
                <div>
                  <Label htmlFor="sku">SKU (Código de Barras)</Label>
                  <Input id="sku" name="sku" value={formData.sku} onChange={handleChange} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader><CardTitle>Precios y Stock</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost">Costo de Compra</Label>
                    <CurrencyInput 
                      id="cost" 
                      name="cost" 
                      value={formData.cost} 
                      onChange={(value: number) => setFormData(prev => ({ ...prev, cost: value }))}
                      showCurrencyLabel={false}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Precio de Venta</Label>
                    <CurrencyInput 
                      id="price" 
                      name="price" 
                      value={formData.price} 
                      onChange={(value: number) => setFormData(prev => ({ ...prev, price: value }))}
                      disabled={formData.ownershipType === 'Familiar'}
                      showCurrencyLabel={false}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stock">Stock Actual</Label>
                    <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} />
                  </div>
                  <div>
                    <Label htmlFor="reorderPoint">Punto de Reorden</Label>
                    <Input id="reorderPoint" name="reorderPoint" type="number" value={formData.reorderPoint || 0} onChange={handleChange} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classification">
            <Card>
              <CardHeader>
                <CardTitle>Categoría y Clasificación</CardTitle>
                <CardDescription>Define el tipo de producto y sus atributos especiales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Categoría Especial */}
                <div>
                  <Label>Categoría Especial</Label>
                  <Select value={formData.category || ''} onValueChange={(value) => handleSelectChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.category && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Se mostrarán campos adicionales para esta categoría
                    </p>
                  )}
                </div>

                {/* Atributos por categoría */}
                {formData.category && (
                  <div className="border-t pt-6">
                    <CategoryAttributes
                      category={formData.category}
                      attributes={formData.attributes || {}}
                      onChange={(attributes) => setFormData(prev => ({ ...prev, attributes }))}
                    />
                  </div>
                )}

                {/* Tipo de Producto (existente) */}
                <div className="border-t pt-6">
                  <Label>Tipo de Producto</Label>
                  <RadioGroup name="type" value={formData.type} onValueChange={(value) => handleSelectChange('type', value)} className="flex space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Venta" id="type-venta" />
                      <Label htmlFor="type-venta" className="font-normal">Para Venta</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Refacción" id="type-refaccion" />
                      <Label htmlFor="type-refaccion" className="font-normal">Refacción</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Tipo de Propiedad (existente) */}
                <div>
                  <Label>Tipo de Propiedad</Label>
                  <Select name="ownershipType" value={formData.ownershipType} onValueChange={(value: any) => handleSelectChange('ownershipType', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ownershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {formData.ownershipType === 'Consigna' && (
                  <div>
                    <Label>Consignador</Label>
                    <Select name="consignorId" value={formData.consignorId || ''} onValueChange={(value) => handleSelectChange('consignorId', value)}>
                      <SelectTrigger><SelectValue placeholder="Seleccione un consignador..." /></SelectTrigger>
                      <SelectContent>{consignors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
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
                 <ComboProductSelector form={formMethodsForSelector as any} allProducts={allProducts} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </form>
  );
}
