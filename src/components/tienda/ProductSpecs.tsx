'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Product } from '@/lib/services/tiendaProductService'
import { TIENDA_SUPPORT_WHATSAPP_URL } from '@/lib/tiendaContact'

interface ProductSpecsProps {
  product: Product
}

export function ProductSpecs({ product }: ProductSpecsProps) {
  const attributes = product.attributes || {}

  return (
    <Tabs defaultValue="descripcion" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="descripcion">Descripción</TabsTrigger>
        <TabsTrigger value="especificaciones">Especificaciones</TabsTrigger>
        <TabsTrigger value="garantia">Garantía</TabsTrigger>
      </TabsList>

      <TabsContent value="descripcion" className="mt-6">
        <div className="prose prose-sm max-w-none">
          <p>
            {attributes.description || `El ${product.name} es un producto de alta calidad que pasa por nuestro riguroso proceso de verificación. Cada unidad es inspeccionada para asegurar su funcionamiento óptimo.`}
          </p>
          <ul>
            <li>Producto verificado y probado</li>
            <li>Incluye accesorios básicos</li>
            <li>Garantía de 12 meses por defectos</li>
            <li>Envío seguro a todo México</li>
          </ul>
        </div>
      </TabsContent>

      <TabsContent value="especificaciones" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">SKU</p>
            <p className="font-mono text-sm font-medium">{product.sku || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Categoría</p>
            <p className="text-sm font-medium">{product.category || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="text-sm font-medium">{product.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Propiedad</p>
            <p className="text-sm font-medium">{product.ownership_type}</p>
          </div>
          {product.attributes?.brand && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Marca</p>
              <p className="text-sm font-medium">{attributes.brand}</p>
            </div>
          )}
          {product.attributes?.model && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Modelo</p>
              <p className="text-sm font-medium">{attributes.model}</p>
            </div>
          )}
          {product.attributes?.condition && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Condición</p>
              <p className="text-sm font-medium">{attributes.condition}</p>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="garantia" className="mt-6">
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2">Garantía de 12 Meses</h4>
            <p className="text-sm text-muted-foreground">
              Todos nuestros productos incluyen garantía de 12 meses contra defectos de fábrica.
              Si tu producto presenta algún problema, contáctanos y te ayudaremos.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">¿Qué está cubierto?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-accent">✓</span>
                <span>Defectos de fabricación</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">✓</span>
                <span>Problemas de funcionamiento</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">✓</span>
                <span>Componentes internos</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Política de Devoluciones</h4>
            <p className="text-sm text-muted-foreground">
              Tienes 30 días para devolver tu producto si no estás satisfecho.
              El producto debe estar en las mismas condiciones en que lo recibiste.
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href={TIENDA_SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-accent hover:underline"
            >
              Contactar soporte
            </a>
            <a href="/tienda/terminos#garantia" className="text-sm font-medium text-accent hover:underline">
              Términos completos
            </a>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
