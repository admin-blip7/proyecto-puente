import type { Product } from '@/lib/services/tiendaProductService'
import { Badge } from '@/components/ui/badge'
import { Star, Check } from 'lucide-react'
import { TIENDA_SOCIO_PACKAGE_QTY } from '@/lib/tiendaPricing'

interface ProductInfoProps {
  product: Product
}

export function ProductInfo({ product }: ProductInfoProps) {
  const isInStock = (product.stock || 0) > 0
  const regularPrice = product.regularPrice ?? product.price
  const socioPrice = product.socioPrice ?? product.price

  return (
    <div className="space-y-6">
      {/* Category & Badges */}
      <div className="flex flex-wrap gap-2">
        {product.category && (
          <Badge variant="outline" className="text-accent border-accent/20">
            {product.category}
          </Badge>
        )}
        {product.type === 'Refacción' && (
          <Badge variant="secondary">Refacción</Badge>
        )}
        {product.ownership_type === 'Consigna' && (
          <Badge variant="secondary">Consigna</Badge>
        )}
        {isInStock && product.stock && product.stock < 5 && (
          <Badge variant="destructive">¡Últimos {product.stock}!</Badge>
        )}
      </div>

      {/* Title */}
      <h1 className="font-editors-note text-3xl lg:text-4xl font-thin leading-tight">
        {product.name}
      </h1>

      {/* SKU */}
      {product.sku && (
        <p className="text-xs text-muted-foreground font-mono">
          SKU: {product.sku}
        </p>
      )}

      {/* Rating */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
                star <= 4 ? 'fill-accent text-accent' : 'text-muted-foreground'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">4.0 (12 reseñas)</span>
      </div>

      {/* Price */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold">
            ${regularPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Precio regular
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold text-accent">
            ${socioPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Precio socio ({TIENDA_SOCIO_PACKAGE_QTY} piezas exactas)
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          El precio regular se respeta sin cambios. El precio socio se calcula automaticamente por categoria y solo aplica en paquetes exactos de {TIENDA_SOCIO_PACKAGE_QTY}.
        </p>
      </div>

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm">
          {isInStock ? 'Disponible' : 'Agotado'}
        </span>
        {isInStock && product.stock && (
          <span className="text-sm text-muted-foreground">
            ({product.stock} disponibles)
          </span>
        )}
      </div>

      {/* Features Checklist */}
      <ul className="space-y-2">
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-accent" />
          <span>Garantía de 12 meses</span>
        </li>
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-accent" />
          <span>Envío a todo México</span>
        </li>
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-accent" />
          <span>Producto verificado</span>
        </li>
      </ul>
    </div>
  )
}
