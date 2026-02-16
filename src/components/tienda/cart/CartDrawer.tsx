'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X, Plus, Minus, ShoppingCart, Trash2, Check } from 'lucide-react'
import Link from 'next/link'
import { useCart } from './CartProvider'
import { Button } from '@/components/ui/button'
import {
  calculateTiendaLinePricing,
  TIENDA_FREE_SHIPPING_THRESHOLD,
} from '@/lib/tiendaPricing'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, subtotal, regularSubtotal, savingsTotal, updateQuantity, removeItem, clearCart } = useCart()

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white dark:bg-black shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4 lg:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-editors-note text-lg font-semibold">Tu Carrito</h2>
                  <p className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mt-6 font-semibold">Tu carrito está vacío</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Agrega productos para comenzar tu compra
                  </p>
                  <Button
                    onClick={onClose}
                    className="mt-6 bg-accent text-black hover:bg-accent/90"
                    asChild
                  >
                    <Link href="/tienda">Explorar productos</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-4">
                  {items.map((item) => {
                    const linePricing = calculateTiendaLinePricing(item.price, item.quantity, item.socioPrice)

                    return (
                      <motion.li
                      key={item.productId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 rounded-lg border border-border bg-secondary/30 p-3"
                    >
                      {/* Product Image */}
                      <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white dark:bg-black">
                        <span className="text-4xl" role="img" aria-label="Producto">
                          {item.category === 'Audio' && '🎧'}
                          {item.category === 'Wearable' && '⌚'}
                          {item.category === 'Camera' && '📷'}
                          {item.category === 'Celular' && '📱'}
                          {!item.category && '📦'}
                        </span>
                      </div>

                      {/* Product Info */}
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-semibold line-clamp-1">{item.name}</h4>
                          {item.sku && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Ref: {item.sku}
                            </p>
                          )}
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="font-semibold">
                              ${linePricing.effectiveUnitPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </p>
                            {linePricing.isSocioApplied ? (
                              <p className="text-[10px] text-green-600 font-medium">
                                Precio socio activo (paquete exacto de 5)
                              </p>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">
                                Socio disponible solo en 5 piezas exactas
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Quantity Controls */}
                            <div className="flex items-center rounded-lg border border-border">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="flex h-7 w-7 items-center justify-center hover:bg-secondary transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="flex h-7 w-7 items-center justify-center hover:bg-secondary transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            {/* Remove Button */}
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      </motion.li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border bg-secondary/30 p-4 lg:p-6">
                {/* Clear Cart */}
                <button
                  onClick={clearCart}
                  className="mb-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpiar carrito
                </button>

                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal regular</span>
                    <span className="font-medium">
                      ${regularSubtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {savingsTotal > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Ahorro socio</span>
                      <span className="font-medium">
                        -${savingsTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-medium text-muted-foreground">
                      Gratis solo si supera ${TIENDA_FREE_SHIPPING_THRESHOLD.toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">
                      ${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <Button
                  onClick={onClose}
                  className="mt-4 w-full bg-accent py-6 text-base font-bold text-black hover:bg-accent/90"
                  asChild
                >
                  <Link href="/tienda/checkout" className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4" />
                    Proceder al pago
                  </Link>
                </Button>

                <p className="mt-3 text-center text-[10px] text-muted-foreground">
                  Precios en MXN. Incluyen IVA.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
