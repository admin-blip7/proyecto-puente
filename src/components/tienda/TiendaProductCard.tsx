'use client'

import Link from 'next/link'
import { Heart, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useCart } from './cart/CartProvider'
import type { Product } from '@/lib/services/tiendaProductService'
import { getProductImageUrl } from '@/lib/services/tiendaProductService'
import { formatCategoryLabel } from '@/lib/utils'

interface TiendaProductCardProps {
  product: Product
  categoryLabel?: string
}

export function TiendaProductCard({ product, categoryLabel }: TiendaProductCardProps) {
  const { addItem } = useCart()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isInStock = (product.stock || 0) > 0
  const hasDiscount = product.cost && product.cost > product.price
  const discountPercentage = hasDiscount
    ? Math.round(((product.cost - product.price) / product.cost) * 100)
    : 0

  const imageUrls = product.image_urls ?? []
  const firstImage: string | undefined = imageUrls[0] ?? undefined
  const productImage: string | undefined = firstImage ? getProductImageUrl(firstImage) : undefined

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image: productImage,
      category: product.category ?? undefined,
    })
  }

  // Determine emoji based on category
  const categoryEmoji = () => {
    const cat = product.category?.toLowerCase() || ''
    if (cat.includes('audio') || cat.includes('sonido')) return '🎧'
    if (cat.includes('watch') || cat.includes('wearable')) return '⌚'
    if (cat.includes('camera') || cat.includes('cámara')) return '📷'
    if (cat.includes('phone') || cat.includes('celular') || cat.includes('smartphone')) return '📱'
    return '📦'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group relative tienda-panel rounded-2xl overflow-hidden hover:border-accent transition-all duration-300 hover-lift"
    >
      {/* Product Image Area */}
      <div className="relative h-64 bg-secondary/60 flex items-center justify-center p-8 border-b border-border">
        {/* Category Badge */}
        {categoryLabel && (
          <span className="absolute top-4 left-4 tienda-pill">
            {formatCategoryLabel(categoryLabel)}
          </span>
        )}

        {/* Discount Badge */}
        {discountPercentage > 0 && (
          <span className="absolute top-4 left-4 bg-destructive text-white text-[9px] font-bold px-2 py-1 uppercase rounded-sm flex items-center gap-1 shadow-sm">
            -{discountPercentage}%
          </span>
        )}

        {/* Wishlist Button */}
        <button
          onClick={() => setIsWishlisted(!isWishlisted)}
          className="absolute top-4 right-4 h-8 w-8 bg-white/95 dark:bg-black/95 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-primary hover:text-black hover:scale-110 transition-all"
        >
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Product Image */}
        {productImage && !imageError ? (
          <motion.img
            src={productImage}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
            onError={() => setImageError(true)}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          <motion.div
            className="text-6xl text-muted-foreground group-hover:text-foreground transition-colors"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
          >
            {categoryEmoji()}
          </motion.div>
        )}

        {/* Quick Add Button (appears on hover) */}
        {isInStock && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddToCart}
            className="absolute bottom-4 left-4 right-4 bg-accent text-black py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md opacity-0 group-hover:opacity-100 transition-all"
          >
            Agregar al carrito
          </motion.button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6">
        <Link href={`/tienda/producto/${product.id}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              {product.category && (
                <span className="text-accent text-[10px] uppercase tracking-[0.22em] font-mono font-bold mb-2 block">
                  {formatCategoryLabel(product.category)}
                </span>
              )}
              <h3 className="font-editors-note text-xl font-semibold group-hover:text-accent transition-colors">
                {product.name}
              </h3>
            </div>
            {product.sku && (
              <span className="text-muted-foreground text-[10px] font-mono hidden sm:block">
                Ref: {product.sku}
              </span>
            )}
          </div>

          <div className="flex items-end justify-between mt-6">
            <div>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through block">
                  ${product.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              )}
              <span className="text-xl font-bold">
                ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Add Button (mobile/always visible) */}
            {isInStock ? (
              <button
                onClick={handleAddToCart}
                className="bg-primary text-black w-10 h-10 rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-colors shadow-lg"
              >
                <Plus className="h-4 w-4" />
              </button>
            ) : (
              <span className="text-xs text-red-500 font-medium">Agotado</span>
            )}
          </div>

          {/* Stock indicator */}
          <div className="mt-3 flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[10px] text-muted-foreground">
              {isInStock ? 'Disponible' : 'Agotado'}
            </span>
            {isInStock && product.stock && product.stock < 5 && (
              <span className="text-[10px] text-orange-500">
                ¡Solo quedan {product.stock}!
              </span>
            )}
          </div>
        </Link>
      </div>
    </motion.div>
  )
}
