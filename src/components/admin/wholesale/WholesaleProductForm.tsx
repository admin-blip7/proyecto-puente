'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createWholesaleProduct } from '@/lib/services/wholesaleService'
import type { Product, WholesaleSupplier } from '@/types'

interface WholesaleProductFormProps {
  suppliers: WholesaleSupplier[]
  products: Product[]
  preselectedProduct?: Product
}

export function WholesaleProductForm({
  suppliers,
  products,
  preselectedProduct,
}: WholesaleProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    productId: preselectedProduct?.id || '',
    supplierId: '',
    supplierSku: '',
    supplierCost: '',
    wholesalePrice: '',
    wholesaleMinQty: '5',
    leadTime: '3-5 días hábiles',
    isActive: true,
  })

  const selectedProduct = products.find((p) => p.id === formData.productId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!formData.productId) {
        throw new Error('Selecciona un producto')
      }
      if (!formData.supplierId) {
        throw new Error('Selecciona un proveedor')
      }
      if (!formData.supplierCost || !formData.wholesalePrice) {
        throw new Error('Ingresa los precios')
      }

      await createWholesaleProduct({
        productId: formData.productId,
        supplierId: formData.supplierId,
        supplierSku: formData.supplierSku.trim() || undefined,
        supplierCost: parseFloat(formData.supplierCost),
        wholesalePrice: parseFloat(formData.wholesalePrice),
        wholesaleMinQty: parseInt(formData.wholesaleMinQty),
        leadTime: formData.leadTime,
        isActive: formData.isActive,
      })

      router.push('/admin/wholesale/products')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear producto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeSuppliers = suppliers.filter((s) => s.isActive !== false)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Product Selection */}
      <div className="space-y-2">
        <Label htmlFor="productId">Producto *</Label>
        <Select
          value={formData.productId}
          onValueChange={(value) => setFormData({ ...formData, productId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un producto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} {product.sku ? `(${product.sku})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProduct && (
          <p className="text-sm text-muted-foreground">
            Precio actual: ${selectedProduct.price?.toFixed(2) || '0.00'}
          </p>
        )}
      </div>

      {/* Supplier Selection */}
      <div className="space-y-2">
        <Label htmlFor="supplierId">Proveedor *</Label>
        <Select
          value={formData.supplierId}
          onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un proveedor" />
          </SelectTrigger>
          <SelectContent>
            {activeSuppliers.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                No hay proveedores.{' '}
                <a href="/admin/wholesale/suppliers" className="text-primary underline">
                  Crea uno primero
                </a>
              </div>
            ) : (
              activeSuppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Supplier SKU */}
      <div className="space-y-2">
        <Label htmlFor="supplierSku">SKU del Proveedor</Label>
        <Input
          id="supplierSku"
          value={formData.supplierSku}
          onChange={(e) => setFormData({ ...formData, supplierSku: e.target.value })}
          placeholder="Ej. PROV-12345"
        />
      </div>

      {/* Supplier Cost */}
      <div className="space-y-2">
        <Label htmlFor="supplierCost">Costo del Proveedor *</Label>
        <Input
          id="supplierCost"
          type="number"
          step="0.01"
          min="0"
          value={formData.supplierCost}
          onChange={(e) => setFormData({ ...formData, supplierCost: e.target.value })}
          placeholder="0.00"
          required
        />
        <p className="text-xs text-muted-foreground">
          Cuánto te cobra el proveedor por unidad
        </p>
      </div>

      {/* Wholesale Price */}
      <div className="space-y-2">
        <Label htmlFor="wholesalePrice">Precio Mayoreo *</Label>
        <Input
          id="wholesalePrice"
          type="number"
          step="0.01"
          min="0"
          value={formData.wholesalePrice}
          onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
          placeholder="0.00"
          required
        />
        <p className="text-xs text-muted-foreground">
          Precio al que venderás en la tienda (mínimo {formData.wholesaleMinQty} unidades)
        </p>
        {formData.supplierCost && formData.wholesalePrice && (
          <p className="text-xs text-green-600">
            Ganancia: ${(parseFloat(formData.wholesalePrice) - parseFloat(formData.supplierCost)).toFixed(2)} por unidad
          </p>
        )}
      </div>

      {/* Minimum Quantity */}
      <div className="space-y-2">
        <Label htmlFor="wholesaleMinQty">Cantidad Mínima *</Label>
        <Input
          id="wholesaleMinQty"
          type="number"
          min="1"
          value={formData.wholesaleMinQty}
          onChange={(e) => setFormData({ ...formData, wholesaleMinQty: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground">
          Mínimo de unidades que el cliente debe comprar
        </p>
      </div>

      {/* Lead Time */}
      <div className="space-y-2">
        <Label htmlFor="leadTime">Tiempo de Entrega</Label>
        <Input
          id="leadTime"
          value={formData.leadTime}
          onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
          placeholder="Ej. 3-5 días hábiles"
        />
        <p className="text-xs text-muted-foreground">
          Tiempo que tarda el proveedor en entregar (se mostrará al cliente)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting || activeSuppliers.length === 0}>
          {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
