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
import { Checkbox } from '@/components/ui/checkbox'
import { bulkCreateWholesaleProducts } from '@/lib/services/wholesaleService'
import { Check, Search, X } from 'lucide-react'
import type { Product, WholesaleSupplier } from '@/types'

interface BulkWholesaleFormProps {
  availableProducts: Product[]
  suppliers: WholesaleSupplier[]
}

export function BulkWholesaleForm({ availableProducts, suppliers }: BulkWholesaleFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [supplierId, setSupplierId] = useState('')
  const [wholesaleMinQty, setWholesaleMinQty] = useState('5')
  const [profitPercent, setProfitPercent] = useState('30')
  const [leadTime, setLeadTime] = useState('3-5 días hábiles')

  const activeSuppliers = suppliers.filter((s) => s.isActive !== false)

  // Filter products by search
  const filteredProducts = availableProducts.filter((p) => {
    const search = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(search) ||
      (p.sku && p.sku.toLowerCase().includes(search))
    )
  })

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Select all visible
  const toggleSelectAll = () => {
    const visibleIds = new Set(filteredProducts.map((p) => p.id))
    if (selectedIds.size === visibleIds.size && [...selectedIds].every((id) => visibleIds.has(id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(visibleIds)
    }
  }

  const isAllSelected = filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id))

  const selectedProducts = availableProducts.filter((p) => selectedIds.has(p.id))
  const profitPercentNumber = Number.parseFloat(profitPercent) || 0

  // Calculate preview prices
  const previewData = selectedProducts.slice(0, 3).map((p) => ({
    ...p,
    wholesalePrice: (p.cost || 0) * (1 + profitPercentNumber / 100),
    profit: (p.cost || 0) * (profitPercentNumber / 100),
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (selectedIds.size === 0) {
        throw new Error('Selecciona al menos un producto')
      }
      if (!supplierId) {
        throw new Error('Selecciona un proveedor')
      }
      if (!profitPercent || parseFloat(profitPercent) <= 0) {
        throw new Error('Ingresa un porcentaje de ganancia válido')
      }

      const productsToCreate = selectedProducts.map((product) => ({
        productId: product.id,
        supplierId,
        supplierSku: null,
        supplierCost: product.cost,
        wholesalePrice: product.cost * (1 + parseFloat(profitPercent) / 100),
        wholesaleMinQty: parseInt(wholesaleMinQty),
        leadTime,
        isActive: true,
      }))

      await bulkCreateWholesaleProducts(productsToCreate)

      router.push('/admin/wholesale/products')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear productos')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Settings Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Supplier */}
        <div className="space-y-2">
          <Label htmlFor="supplier">Proveedor *</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent>
              {activeSuppliers.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  No hay proveedores.{' '}
                  <a href="/admin/wholesale/suppliers/new" className="text-primary underline">
                    Crear uno
                  </a>
                </div>
              ) : (
                activeSuppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Min Qty */}
        <div className="space-y-2">
          <Label htmlFor="minQty">Cantidad Mínima *</Label>
          <Input
            id="minQty"
            type="number"
            min="1"
            value={wholesaleMinQty}
            onChange={(e) => setWholesaleMinQty(e.target.value)}
          />
        </div>

        {/* Profit Percentage */}
        <div className="space-y-2">
          <Label htmlFor="profitPercent">Ganancia (%) *</Label>
          <Input
            id="profitPercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={profitPercent}
            onChange={(e) => setProfitPercent(e.target.value)}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">
            Precio = costo + (costo × {profitPercent}%)
          </p>
        </div>

        {/* Lead Time */}
        <div className="space-y-2">
          <Label htmlFor="leadTime">Tiempo de Entrega</Label>
          <Input
            id="leadTime"
            value={leadTime}
            onChange={(e) => setLeadTime(e.target.value)}
            placeholder="3-5 días hábiles"
          />
        </div>
      </div>

      {/* Preview */}
      {selectedProducts.length > 0 && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Vista Previa (primeros 3)</h3>
          <div className="space-y-2 text-sm">
            {previewData.map((p) => (
              <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded">
                <span className="truncate max-w-[200px]">{p.name}</span>
                <span className="text-muted-foreground">${p.cost?.toFixed(2) || '0.00'}</span>
                <span className="font-medium text-green-600">
                  +${p.profit?.toFixed(2) || '0.00'} ({profitPercent}%)
                </span>
                <span className="font-bold text-primary">
                  ${p.wholesalePrice?.toFixed(2) || '0.00'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            +{Math.max(selectedProducts.length - 3, 0)} producto(s) más seleccionado(s)
          </p>
        </div>
      )}

      {/* Products List with Search */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Productos ({filteredProducts.length} disponibles, {selectedIds.size} seleccionados)
          </h3>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar ({selectedIds.size})
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              disabled={filteredProducts.length === 0}
            >
              {isAllSelected ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Deseleccionar todos
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Seleccionar todos
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No se encontraron productos
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto border rounded-lg divide-y">
            {filteredProducts.map((product) => (
              <label
                key={product.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={() => toggleSelection(product.id)}
                />
                {product.imageUrls && product.imageUrls[0] && (
                  <img
                    src={product.imageUrls[0]}
                    alt={product.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    SKU: {product.sku || 'Sin SKU'} | Costo: ${product.cost?.toFixed(2) || '0.00'}
                  </div>
                </div>
                {selectedIds.has(product.id) && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting || selectedIds.size === 0 || !supplierId}
        >
          {isSubmitting
            ? `Configurando ${selectedIds.size} productos...`
            : `Configurar ${selectedIds.size} productos para Dropshipping`
          }
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
