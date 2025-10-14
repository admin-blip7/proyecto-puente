"use client";

import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/types';
import {
  getProductVariants,
  addProductVariant,
  updateProductVariant,
  deleteProductVariant
} from '@/lib/services/productService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Edit,
  Trash2,
  Battery,
  Smartphone,
  Package,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import CurrencyInput from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface VariantManagerProps {
  product: Product;
  onVariantChange?: () => void;
}

interface VariantFormData {
  sku: string;
  serialNumber?: string;
  imei?: string;
  price: number;
  cost: number;
  status: ProductVariant["status"];
  batteryHealth?: number;
  storage?: number;
  aestheticCondition?: string;
  color?: string;
  replacedParts: string[];
  notes?: string;
}

export default function VariantManager({ product, onVariantChange }: VariantManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState<VariantFormData>({
    sku: '',
    serialNumber: '',
    imei: '',
    price: 0,
    cost: 0,
    status: 'available',
    batteryHealth: 100,
    storage: 0,
    aestheticCondition: '10/10',
    color: '',
    replacedParts: [],
    notes: '',
  });
  const [newPart, setNewPart] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadVariants();
  }, [product.id]);

  const loadVariants = async () => {
    setIsLoading(true);
    try {
      const productVariants = await getProductVariants(product.id);
      setVariants(productVariants);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las variantes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      serialNumber: '',
      imei: '',
      price: 0,
      cost: 0,
      status: 'available',
      batteryHealth: 100,
      storage: 0,
      aestheticCondition: '10/10',
      color: '',
      replacedParts: [],
      notes: '',
    });
    setNewPart('');
    setEditingVariant(null);
  };

  const handleOpenDialog = (variant?: ProductVariant) => {
    if (variant) {
      setEditingVariant(variant);
      setFormData({
        sku: variant.sku,
        serialNumber: variant.serialNumber || '',
        imei: variant.imei || '',
        price: variant.price || 0,
        cost: variant.cost || 0,
        status: variant.status,
        batteryHealth: variant.batteryHealth || 100,
        storage: variant.storage || 0,
        aestheticCondition: variant.aestheticCondition || '10/10',
        color: variant.color || '',
        replacedParts: variant.replacedParts ?? [],
        notes: variant.notes || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    try {
      if (editingVariant) {
        await updateProductVariant(editingVariant.id, formData);
        toast({
          title: "Variante actualizada",
          description: "La variante ha sido actualizada exitosamente",
        });
      } else {
        await addProductVariant(product.id, formData);
        toast({
          title: "Variante agregada",
          description: "La nueva variante ha sido agregada exitosamente",
        });
      }

      await loadVariants();
      handleCloseDialog();
      onVariantChange?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la variante",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (variantId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta variante?')) {
      try {
        await deleteProductVariant(variantId);
        toast({
          title: "Variante eliminada",
          description: "La variante ha sido eliminada exitosamente",
        });
        await loadVariants();
        onVariantChange?.();
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo eliminar la variante",
          variant: "destructive",
        });
      }
    }
  };

  const addReplacedPart = () => {
    if (newPart.trim()) {
      setFormData(prev => ({
        ...prev,
        replacedParts: [...prev.replacedParts, newPart.trim()]
      }));
      setNewPart('');
    }
  };

  const removeReplacedPart = (index: number) => {
    setFormData(prev => ({
      ...prev,
      replacedParts: prev.replacedParts.filter((_, i) => i !== index)
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'sold':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'reserved':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'repair':
        return <Package className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      available: { label: 'Disponible', variant: 'default' },
      sold: { label: 'Vendido', variant: 'destructive' },
      reserved: { label: 'Reservado', variant: 'secondary' },
      repair: { label: 'En Reparación', variant: 'outline' },
    };

    const config = variants[status] || variants.available;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Variantes del Producto</h3>
          <p className="text-sm text-muted-foreground">
            Gestione las unidades individuales de {product.name}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Variante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVariant ? 'Editar Variante' : 'Nueva Variante'}
              </DialogTitle>
              <DialogDescription>
                {editingVariant
                  ? 'Modifique los detalles de esta variante'
                  : 'Ingrese los detalles de la nueva variante'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="sku">SKU / Código</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="reserved">Reservado</SelectItem>
                    <SelectItem value="repair">En Reparación</SelectItem>
                    <SelectItem value="sold">Vendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="serialNumber">Número de Serie</Label>
                <Input
                  id="serialNumber"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="imei">IMEI</Label>
                <Input
                  id="imei"
                  value={formData.imei}
                  onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="cost">Costo</Label>
                <CurrencyInput
                  value={formData.cost}
                  onChange={(value) => setFormData(prev => ({ ...prev, cost: value ?? 0 }))}
                  showCurrencyLabel={false}
                />
              </div>

              <div>
                <Label htmlFor="price">Precio de Venta</Label>
                <CurrencyInput
                  value={formData.price}
                  onChange={(value) => setFormData(prev => ({ ...prev, price: value ?? 0 }))}
                  showCurrencyLabel={false}
                />
              </div>

              <div>
                <Label htmlFor="batteryHealth">
                  <Battery className="inline w-4 h-4 mr-1" />
                  Salud de Batería (%)
                </Label>
                <Input
                  id="batteryHealth"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.batteryHealth}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    batteryHealth: parseInt(e.target.value) || 0
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="storage">
                  <Smartphone className="inline w-4 h-4 mr-1" />
                  Almacenamiento (GB)
                </Label>
                <Input
                  id="storage"
                  type="number"
                  min="0"
                  value={formData.storage}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    storage: parseInt(e.target.value) || 0
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="Ej: Negro, Azul, etc."
                />
              </div>

              <div>
                <Label htmlFor="aestheticCondition">Condición Estética</Label>
                <Input
                  id="aestheticCondition"
                  value={formData.aestheticCondition}
                  onChange={(e) => setFormData(prev => ({ ...prev, aestheticCondition: e.target.value }))}
                  placeholder="Ej: 9/10, 8/10, etc."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Partes Reemplazadas</Label>
              <div className="flex gap-2">
                <Input
                  value={newPart}
                  onChange={(e) => setNewPart(e.target.value)}
                  placeholder="Ej: Batería, Pantalla, etc."
                  onKeyPress={(e) => e.key === 'Enter' && addReplacedPart()}
                />
                <Button type="button" onClick={addReplacedPart}>
                  Agregar
                </Button>
              </div>
              {formData.replacedParts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.replacedParts.map((part, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer">
                      {part}
                      <button
                        type="button"
                        onClick={() => removeReplacedPart(index)}
                        className="ml-2 text-xs hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas sobre el estado o características especiales..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingVariant ? 'Actualizar' : 'Guardar'} Variante
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {variants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No hay variantes registradas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Agregue la primera variante para empezar a gestionar las unidades individuales
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {variants.map((variant) => (
            <Card key={variant.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-base">{variant.sku}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(variant.status)}
                      {getStatusBadge(variant.status)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(variant)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(variant.id)}
                      disabled={variant.status === 'sold'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {variant.serialNumber && (
                  <p className="text-sm"><span className="font-medium">Serie:</span> {variant.serialNumber}</p>
                )}
                {variant.imei && (
                  <p className="text-sm"><span className="font-medium">IMEI:</span> {variant.imei}</p>
                )}
                {variant.batteryHealth !== undefined && (
                  <p className="text-sm">
                    <span className="font-medium">Batería:</span> {variant.batteryHealth}%
                  </p>
                )}
                {variant.storage && (
                  <p className="text-sm">
                    <span className="font-medium">Almacenamiento:</span> {variant.storage}GB
                  </p>
                )}
                {variant.color && (
                  <p className="text-sm">
                    <span className="font-medium">Color:</span> {variant.color}
                  </p>
                )}
                {variant.aestheticCondition && (
                  <p className="text-sm">
                    <span className="font-medium">Condición:</span> {variant.aestheticCondition}
                  </p>
                )}
                {variant.replacedParts && variant.replacedParts.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Reparado:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {variant.replacedParts.map((part, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {part}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {variant.price && variant.cost && (
                  <div className="pt-2 border-t text-sm">
                    <p><span className="font-medium">Costo:</span> ${variant.cost.toFixed(2)}</p>
                    <p><span className="font-medium">Precio:</span> ${variant.price.toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}