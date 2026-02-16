'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { calculateTiendaLinePricing } from '@/lib/tiendaPricing'

export interface CartItem {
  productId: string
  name: string
  sku: string | null
  price: number
  socioPrice?: number
  quantity: number
  image?: string
  category?: string
}

export interface CartContextType {
  items: CartItem[]
  itemCount: number
  subtotal: number
  regularSubtotal: number
  savingsTotal: number
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_COOKIE_NAME = 'tienda_cart'
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load cart from localStorage on mount (client-side)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_COOKIE_NAME)
      if (stored) {
        const parsed = JSON.parse(stored)
        setItems(parsed)
      }
    } catch (e) {
      console.error('Failed to load cart:', e)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_COOKIE_NAME, JSON.stringify(items))
      } catch (e) {
        console.error('Failed to save cart:', e)
      }
    }
  }, [items, isInitialized])

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const quantityToAdd = Math.max(1, Math.floor(quantity))

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId)
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + quantityToAdd }
            : i
        )
      }
      return [...prev, { ...item, quantity: quantityToAdd }]
    })
    setIsOpen(true)
  }

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const regularSubtotal = items.reduce((sum, item) => {
    return sum + calculateTiendaLinePricing(item.price, item.quantity, item.socioPrice).regularLineTotal
  }, 0)
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateTiendaLinePricing(item.price, item.quantity, item.socioPrice).finalLineTotal
  }, 0)
  const savingsTotal = regularSubtotal - subtotal

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        regularSubtotal,
        savingsTotal,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
