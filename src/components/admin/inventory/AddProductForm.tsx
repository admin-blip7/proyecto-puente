
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Consignor, ownershipTypes } from "@/types";
import { addProduct } from "@/lib/services/productService";
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
import CategoryAttributes from "./CategoryAttributes";
import { getProductCategories, ProductCategory } from "@/lib/services/categoryService";
import { useEffect } from "react";
import CurrencyInput from "@/components/ui/currency-input";
import ProductImageManager from "./ProductImageManager";
import { getLogger } from "@/lib/logger";
const log = getLogger("AddProductForm");

interface AddProductFormProps {
  consignors: Consignor[];
  allProducts: Product[];
}

const initialFormData: Omit<Product, 'id' | 'createdAt' | 'searchKeywords' | 'compatibilityTags' | 'attributes'> & {
  compatibilityTags: string[];
  attributes: Record<string, any>;
  imageUrls: string[];
} = {
  name: '',
  sku: '',
  price: 0,
  cost: 0,
  stock: 0,
  reorderPoint: 0,
  type: 'Venta',
  ownershipType: 'Propio',
  consignorId: undefined,
  comboProductIds: [],
  compatibilityTags: [],
  category: '',
  attributes: {},
  imageUrls: [],
};

export default function AddProductForm({ consignors, allProducts }: AddProductFormProps) {
  const [formData, setFormData] = useState(initialFormData);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getProductCategories().then(setCategories);
  }, []);
  const { toast } = useToast();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    let processedValue: string | number = value;
    if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }

    setFormData(prevData => ({ ...prevData, [name]: processedValue }));
  };

  const handleSelectChange = (name: keyof Product, value: string) => {
    const updatedFormData: any = { ...formData, [name]: value };
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

  const handleSaveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    log.info("Creando nuevo producto con datos:", formData);

    try {
      await addProduct(formData);

      log.info("¡Éxito! Producto creado.");
      toast({
        title: "Producto Agregado",
        description: `El producto "${formData.name}" ha sido creado exitosamente.`,
      });

      router.push('/admin');
      router.refresh();

    } catch (error) {
      log.error("ERROR AL GUARDAR:", error);
      toast({
        variant: "destructive",
        title: "Error al Crear",
        description: "No se pudo crear el producto. Revisa la consola para más detalles.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formMethodsForSelector = {
    watch: (fieldName: keyof typeof initialFormData) => formData[fieldName],
    setValue: (fieldName: keyof typeof initialFormData, value: any) => {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
    },
    getValues: (fieldName: keyof typeof initialFormData) => formData[fieldName],
  };


  return (
    <form onSubmit={handleSaveProduct} className="h-full flex flex-col">
      <header className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
              <span className="sm:hidden">Atrás</span>
            </Link>
          </Button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-center flex-1">Agregar Nuevo Producto</h1>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="general" className="w-full flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs sm:text-sm">Precios</TabsTrigger>
          <TabsTrigger value="classification" className="text-xs sm:text-sm">Categoría</TabsTrigger>
          <TabsTrigger value="images" className="text-xs sm:text-sm">Imágenes</TabsTrigger>
          <TabsTrigger value="relations" className="text-xs sm:text-sm">Combos</TabsTrigger>
        </TabsList>

        <div className="py-6 flex-1 overflow-y-auto">
          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
              <CardContent className="space-y-4 px-2 sm:px-6">
                <div>
                  <Label htmlFor="name" className="text-sm sm:text-base">Nombre del Producto</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="text-base" />
                </div>
                <div>
                  <Label htmlFor="sku" className="text-sm sm:text-base">SKU (Código de Barras)</Label>
                  <Input id="sku" name="sku" value={formData.sku} onChange={handleChange} required className="text-base" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader><CardTitle>Precios y Stock</CardTitle></CardHeader>
              <CardContent className="space-y-4 px-2 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost" className="text-sm sm:text-base">Costo de Compra</Label>
                    <CurrencyInput
                      id="cost"
                      name="cost"
                      value={formData.cost}
                      onChange={(value: number) => setFormData(prev => ({ ...prev, cost: value }))}
                      showCurrencyLabel={false}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price" className="text-sm sm:text-base">Precio de Venta</Label>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stock" className="text-sm sm:text-base">Stock Inicial</Label>
                    <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} className="text-base" />
                  </div>
                  <div>
                    <Label htmlFor="reorderPoint" className="text-sm sm:text-base">Punto de Reorden</Label>
                    <Input id="reorderPoint" name="reorderPoint" type="number" value={formData.reorderPoint || 0} onChange={handleChange} className="text-base" />
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
              <CardContent className="space-y-6 px-2 sm:px-6">
                {/* Categoría Especial */}
                <div>
                  <Label className="text-sm sm:text-base">Categoría Especial</Label>
                  <Select value={formData.category || ''} onValueChange={(value) => handleSelectChange('category', value)}>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
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
                      attributes={formData.attributes}
                      onChange={(attributes) => setFormData(prev => ({ ...prev, attributes }))}
                    />
                  </div>
                )}

                {/* Tipo de Producto (existente) */}
                <div className="border-t pt-6">
                  <Label className="text-sm sm:text-base">Tipo de Producto</Label>
                  <RadioGroup name="type" value={formData.type} onValueChange={(value) => handleSelectChange('type', value)} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Venta" id="type-venta" />
                      <Label htmlFor="type-venta" className="font-normal text-sm sm:text-base">Para Venta</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Refacción" id="type-refaccion" />
                      <Label htmlFor="type-refaccion" className="font-normal text-sm sm:text-base">Refacción</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Tipo de Propiedad (existente) */}
                <div>
                  <Label className="text-sm sm:text-base">Tipo de Propiedad</Label>
                  <Select name="ownershipType" value={formData.ownershipType} onValueChange={(value: any) => handleSelectChange('ownershipType', value)}>
                    <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>{ownershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                {formData.ownershipType === 'Consigna' && (
                  <div>
                    <Label className="text-sm sm:text-base">Consignador</Label>
                    <Select name="consignorId" value={formData.consignorId || ''} onValueChange={(value) => handleSelectChange('consignorId', value)}>
                      <SelectTrigger className="text-base"><SelectValue placeholder="Seleccione un consignador..." /></SelectTrigger>
                      <SelectContent>{consignors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle>Imágenes del Producto</CardTitle>
                <CardDescription>Sube fotos o genera imágenes con IA</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductImageManager
                  imageUrls={formData.imageUrls || []}
                  onChange={(urls) => setFormData(prev => ({ ...prev, imageUrls: urls }))}
                  productName={formData.name}
                />
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
