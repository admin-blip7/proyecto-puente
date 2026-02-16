'use client'

import Link from 'next/link'
import { Heart, Trash2, ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getProductImageUrl } from '@/lib/services/tiendaProductService'
import type { Product } from '@/lib/services/tiendaProductService'

interface WishlistItem {
  productId: string
  product: Product
  addedAt: number
}

export function FavoritosClient() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('tienda_wishlist')
    if (stored) {
      try {
        setWishlist(JSON.parse(stored))
      } catch {
        console.error('Error parsing wishlist')
      }
    }
    setIsLoaded(true)
  }, [])

  const removeFromWishlist = (productId: string) => {
    const updated = wishlist.filter(item => item.productId !== productId)
    setWishlist(updated)
    localStorage.setItem('tienda_wishlist', JSON.stringify(updated))
  }

  const addToCart = (item: WishlistItem) => {
    const existing = localStorage.getItem('tienda_cart')
    let cart: any[] = []
    if (existing) {
      try {
        cart = JSON.parse(existing)
      } catch {}
    }
    
    const existingIndex = cart.findIndex((i: any) => i.productId === item.productId)
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1
    } else {
      cart.push({
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        price: item.product.price,
        socioPrice: item.product.socioPrice,
        quantity: 1,
        category: item.product.category,
      })
    }
    
    localStorage.setItem('tienda_cart', JSON.stringify(cart))
    window.dispatchEvent(new Event('tienda_cart_update'))
    window.location.href = '/tienda?cart=open'
  }

  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-8 w-8 text-accent" />
        <h1 className="text-3xl font-bold">Mis Favoritos</h1>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No tienes productos favoritos</h2>
          <p className="text-muted-foreground mb-6">Guarda productos para verlos después</p>
          <Link
            href="/tienda"
            className="inline-flex items-center justify-center bg-primary text-black px-6 py-3 rounded-lg font-bold"
          >
            Ver Productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map((item) => {
            const imageUrls = item.product.image_urls ?? []
            const productImage = imageUrls[0] ? getProductImageUrl(imageUrls[0]) : null
            
            return (
              <motion.div
                key={item.productId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="tienda-panel rounded-2xl overflow-hidden"
              >
                <Link href={`/tienda/producto/${item.productId}`}>
                  <div className="aspect-square bg-secondary/50 flex items-center justify-center p-4">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={item.product.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-6xl">📦</span>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/tienda/producto/${item.productId}`}>
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2 hover:text-accent">
                      {item.product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      ${item.product.price?.toLocaleString('es-MX') || '0'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToCart(item)}
                        className="h-8 w-8 flex items-center justify-center rounded-full bg-primary text-black hover:bg-accent"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFromWishlist(item.productId)}
                        className="h-8 w-8 flex items-center justify-center rounded-full border border-border hover:border-red-500 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
