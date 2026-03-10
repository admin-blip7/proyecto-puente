'use client'

import Link from 'next/link'
import { Heart, Plus, Check, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { useCart } from './cart/CartProvider'
import type { Product } from '@/lib/services/tiendaProductService'
import { getProductImageUrl } from '@/lib/services/tiendaProductService'
import { formatCategoryLabel } from '@/lib/utils'
import { TIENDA_SOCIO_PACKAGE_QTY } from '@/lib/tiendaPricing'

interface TiendaProductCardProps {
  product: Product
  categoryLabel?: string
}

export function TiendaProductCard({ product, categoryLabel }: TiendaProductCardProps) {
  const { addItem } = useCart()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isAdded, setIsAdded] = useState(false)

  const isInStock = (product.stock || 0) > 0
  const regularPrice = product.regularPrice ?? product.price
  const socioPrice = product.socioPrice ?? product.price

  const imageUrls = product.image_urls ?? []
  const firstImage: string | undefined = imageUrls[0] ?? undefined
  const productImage: string | undefined = firstImage ? getProductImageUrl(firstImage) : undefined

  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    
    addItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      socioPrice: product.socioPrice,
      image: productImage,
      category: product.category ?? undefined,
    })
    
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 1500)
  }

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
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-background rounded-3xl overflow-hidden border border-border hover:border-accent/50 transition-all duration-500 hover:shadow-2xl hover:shadow-accent/5"
    >
      {/* Gradient Background on Hover */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Product Image Area */}
      <div className="relative h-72 bg-gradient-to-b from-secondary/80 to-secondary/40 flex items-center justify-center p-8 border-b border-border/50 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute top-4 right-4 w-20 h-20 bg-accent/10 rounded-full blur-2xl" />
          <div className="absolute bottom-4 left-4 w-16 h-16 bg-primary/10 rounded-full blur-2xl" />
        </div>

        {/* Category Badge */}
        {categoryLabel && (
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            {formatCategoryLabel(categoryLabel)}
          </motion.span>
        )}

        {/* Socio Badge */}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-4 right-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider shadow-lg"
        >
          Socio x{TIENDA_SOCIO_PACKAGE_QTY}
        </motion.span>

        {/* Premium Badge */}
        {regularPrice > 10000 && (
          <span className="absolute top-14 right-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent text-black text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-accent/30">
            <Zap className="h-3 w-3" />
            Premium
          </span>
        )}

        {/* Wishlist Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.preventDefault()
            setIsWishlisted(!isWishlisted)
          }}
          className="absolute top-4 right-4 h-9 w-9 bg-background/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-10"
          style={{ left: '16px', top: '44px' }}
        >
          <Heart className={`h-4 w-4 transition-colors ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
        </motion.button>

        {/* Product Image */}
        <Link href={`/tienda/producto/${product.id}`} className="relative w-full h-full flex items-center justify-center">
          {productImage && !imageError ? (
            <motion.img
              src={productImage}
              alt={product.name}
              className="max-h-full max-w-full object-contain drop-shadow-2xl"
              onError={() => setImageError(true)}
              animate={{ 
                scale: isHovered ? 1.08 : 1,
                rotate: isHovered ? 2 : 0
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          ) : (
            <motion.div
              className="text-8xl drop-shadow-2xl"
              animate={{ 
                scale: isHovered ? 1.1 : 1,
                rotate: isHovered ? 5 : 0
              }}
              transition={{ duration: 0.4 }}
            >
              {categoryEmoji()}
            </motion.div>
          )}
        </Link>

        {/* Quick Add Button */}
        {isInStock && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddToCart}
            disabled={isAdded}
            className={`absolute bottom-4 left-4 right-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider shadow-xl transition-all ${
              isAdded 
                ? 'bg-green-500 text-white' 
                : 'bg-accent text-black hover:bg-accent/90'
            }`}
          >
            {isAdded ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                Agregado
              </span>
            ) : (
              'Agregar al carrito'
            )}
          </motion.button>
        )}

        {/* Out of Stock Overlay */}
        {!isInStock && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <span className="px-4 py-2 bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-full">
              Agotado
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-6 relative">
        <Link href={`/tienda/producto/${product.id}`}>
          {/* Category */}
          {product.category && (
            <span className="text-accent text-[10px] uppercase tracking-[0.2em] font-mono font-bold mb-2 block">
              {formatCategoryLabel(product.category)}
            </span>
          )}
          
          {/* Product Name */}
          <h3 className="font-editors-note text-xl lg:text-2xl font-medium mb-3 group-hover:text-accent transition-colors line-clamp-2">
            {product.name}
          </h3>

          {/* SKU */}
          {product.sku && (
            <span className="text-muted-foreground text-[10px] font-mono mb-4 block">
              SKU: {product.sku}
            </span>
          )}

          {/* Price Section */}
          <div className="flex items-end justify-between mt-4">
            <div>
              <span className="text-sm text-muted-foreground block">
                Regular: ${regularPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-lg font-semibold tracking-tight text-accent block">
                Socio (x{TIENDA_SOCIO_PACKAGE_QTY}): ${socioPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Mobile Add Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAddToCart}
              disabled={!isInStock || isAdded}
              className={`lg:hidden h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isAdded 
                  ? 'bg-green-500 text-white' 
                  : isInStock 
                    ? 'bg-accent text-black' 
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isAdded ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </motion.button>

            {/* Desktop Add Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAddToCart}
              disabled={!isInStock || isAdded}
              className={`hidden lg:flex h-11 w-11 rounded-full items-center justify-center shadow-lg transition-all ${
                isAdded 
                  ? 'bg-green-500 text-white' 
                  : isInStock 
                    ? 'bg-primary text-background hover:bg-accent' 
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </motion.button>
          </div>

          {/* Stock Indicator */}
          <div className="mt-4 flex items-center gap-2">
            <motion.div 
              className={`h-2 w-2 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`}
              animate={{ scale: isInStock ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs text-muted-foreground">
              {isInStock ? 'En stock' : 'Agotado'}
            </span>
            {isInStock && product.stock && product.stock < 5 && (
              <span className="text-xs text-orange-500 font-medium ml-auto">
                ¡Solo {product.stock} disponibles!
              </span>
            )}
          </div>
        </Link>
      </div>
    </motion.div>
  )
}
