'use server'

import { cookies } from 'next/headers'

export interface CartItem {
  productId: string
  name: string
  sku: string | null
  price: number
  quantity: number
  image?: string
  category?: string
}

const CART_COOKIE_NAME = 'tienda_cart'
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * Server-side cart utilities for API routes
 */
export async function getServerCart(): Promise<CartItem[]> {
  const cookieStore = await cookies()
  const cartCookie = cookieStore.get(CART_COOKIE_NAME)
  if (!cartCookie) return []
  try {
    return JSON.parse(cartCookie.value)
  } catch {
    return []
  }
}

export async function setServerCart(items: CartItem[]): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set({
    name: CART_COOKIE_NAME,
    value: JSON.stringify(items),
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CART_COOKIE_MAX_AGE,
    path: '/',
  })
}

export async function clearServerCart(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(CART_COOKIE_NAME)
}
