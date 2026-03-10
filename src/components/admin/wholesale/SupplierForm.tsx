'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createWholesaleSupplier } from '@/lib/services/wholesaleService'
import type { WholesaleSupplier } from '@/types'

export function SupplierForm({ supplier }: { supplier?: WholesaleSupplier }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contactName: supplier?.contactName || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    whatsapp: supplier?.whatsapp || '',
    address: supplier?.address || '',
    leadTimeDefault: supplier?.leadTimeDefault || '3-5 días hábiles',
    notes: supplier?.notes || '',
    isActive: supplier?.isActive ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!formData.name) {
        throw new Error('El nombre es requerido')
      }

      const supplierData: Omit<WholesaleSupplier, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        contactName: formData.contactName || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        whatsapp: formData.whatsapp || undefined,
        address: formData.address || undefined,
        leadTimeDefault: formData.leadTimeDefault,
        notes: formData.notes || undefined,
        isActive: formData.isActive,
      }

      if (supplier) {
        // Update existing supplier - TODO: implement updateWholesaleSupplier action
        await createWholesaleSupplier(supplierData)
      } else {
        await createWholesaleSupplier(supplierData)
      }

      router.push('/admin/wholesale/suppliers')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar proveedor')
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

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información Básica</h3>

        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Proveedor *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej. Distribuidora de Celulares SA"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">Nombre de Contacto</Label>
          <Input
            id="contactName"
            value={formData.contactName}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
            placeholder="Ej. Juan Pérez"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Dirección</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Ej. Calle 123 #45-67"
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información de Contacto</h3>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="ejemplo@proveedor.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+52 55 1234 5678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp (con código de país)</Label>
          <Input
            id="whatsapp"
            type="tel"
            value={formData.whatsapp}
            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            placeholder="525512345678"
          />
          <p className="text-xs text-muted-foreground">
            Solo números, incluyendo código de país (ej. 52 para México)
          </p>
        </div>
      </div>

      {/* Dropshipping Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Configuración Dropshipping</h3>

        <div className="space-y-2">
          <Label htmlFor="leadTimeDefault">Tiempo de Entrega Predeterminado</Label>
          <Input
            id="leadTimeDefault"
            value={formData.leadTimeDefault}
            onChange={(e) => setFormData({ ...formData, leadTimeDefault: e.target.value })}
            placeholder="Ej. 3-5 días hábiles"
          />
          <p className="text-xs text-muted-foreground">
            Este tiempo se usará por defecto para los productos si no se especifica uno particular
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notas adicionales sobre el proveedor..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : supplier ? 'Actualizar' : 'Crear Proveedor'}
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
