'use client'

import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from './cart/CartProvider'
import { Button } from '@/components/ui/button'
import type { Product } from '@/lib/services/tiendaProductService'
import { calculateTiendaLinePricing } from '@/lib/tiendaPricing'

interface AddToCartButtonProps {
  product: Product
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const isInStock = (product.stock || 0) > 0
  const maxQuantity = product.stock || 99
  const linePricing = calculateTiendaLinePricing(product.price, quantity, product.socioPrice)

  const handleAddToCart = () => {
    if (!isInStock || isAdding) return

    setIsAdding(true)
    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      socioPrice: product.socioPrice,
      image: undefined,
      category: product.category,
    }, quantity)

    // Show added state
    setTimeout(() => {
      setIsAdding(false)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    }, 500)
  }

  const updateQuantity = (delta: number) => {
    const newQty = quantity + delta
    if (newQty >= 1 && newQty <= maxQuantity) {
      setQuantity(newQty)
    }
  }

  return (
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Cantidad:</span>
        <div className="flex items-center border border-border rounded-lg">
          <button
            onClick={() => updateQuantity(-1)}
            disabled={quantity <= 1}
            className="flex h-10 w-10 items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            min={1}
            max={maxQuantity}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1
              if (val >= 1 && val <= maxQuantity) {
                setQuantity(val)
              }
            }}
            className="w-16 h-10 text-center border-x border-border bg-transparent text-sm font-medium focus:outline-none"
          />
          <button
            onClick={() => updateQuantity(1)}
            disabled={quantity >= maxQuantity}
            className="flex h-10 w-10 items-center justify-center hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {product.stock && product.stock < 10 && (
          <span className="text-xs text-orange-500">
            Solo {product.stock} disponibles
          </span>
        )}
      </div>

      {/* Add to Cart Button */}
      <Button
        onClick={handleAddToCart}
        disabled={!isInStock || isAdding}
        className="w-full bg-accent py-6 text-base font-bold text-black hover:bg-accent/90 h-auto"
      >
        {isAdding ? (
          <span className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              ⏳
            </motion.span>
            Agregando...
          </span>
        ) : added ? (
          <span className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            ¡Agregado al carrito!
          </span>
        ) : !isInStock ? (
          <span className="flex items-center gap-2">
            ✕ Agotado
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Agregar al carrito
          </span>
        )}
      </Button>

      {/* Subtotal Preview */}
      {quantity > 1 && (
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            Subtotal: ${linePricing.finalLineTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          {linePricing.isSocioApplied ? (
            <p className="text-green-600 font-medium">
              Precio socio aplicado por paquete exacto de 5
            </p>
          ) : (
            <p>
              Precio socio disponible solo con cantidad exacta de 5 piezas
            </p>
          )}
        </div>
      )}
    </div>
  )
}
