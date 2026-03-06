import { supabase } from '@/lib/supabaseClient'
import { v4 as uuidv4 } from 'uuid'
import { WholesaleProduct, WholesaleOrder, WholesaleSupplier, WholesaleOrderItem, Product } from '@/types'

const TABLES = {
  suppliers: 'wholesale_suppliers',
  products: 'wholesale_products',
  orders: 'wholesale_orders',
} as const

// ============================================================================
// PROVEEDORES
// ============================================================================

export async function getWholesaleSuppliers(): Promise<WholesaleSupplier[]> {
  const { data, error } = await supabase
    .from(TABLES.suppliers)
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return (data || []) as WholesaleSupplier[]
}

export async function getWholesaleSupplierById(id: string): Promise<WholesaleSupplier | null> {
  const { data, error } = await supabase
    .from(TABLES.suppliers)
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as WholesaleSupplier | null
}

export async function createWholesaleSupplier(supplier: Omit<WholesaleSupplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<WholesaleSupplier> {
  const { data, error } = await supabase
    .from(TABLES.suppliers)
    .insert(supplier)
    .select()
    .single()

  if (error) throw error
  return data as WholesaleSupplier
}

export async function updateWholesaleSupplier(id: string, updates: Partial<WholesaleSupplier>): Promise<WholesaleSupplier> {
  const { data, error } = await supabase
    .from(TABLES.suppliers)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as WholesaleSupplier
}

export async function deleteWholesaleSupplier(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.suppliers)
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// PRODUCTOS DROPSHIPPING
// ============================================================================

export async function getWholesaleProducts(): Promise<WholesaleProduct[]> {
  // First get wholesale products with supplier info
  const { data: wholesaleData, error } = await supabase
    .from(TABLES.products)
    .select(`
      *,
      supplier:wholesale_suppliers(id, name, whatsapp, email)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  if (!wholesaleData || wholesaleData.length === 0) return []

  // Get all product IDs
  const productIds = wholesaleData.map((wp: any) => wp.product_id).filter(Boolean)

  if (productIds.length === 0) return []

  // Fetch the actual products
  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, sku, price, stock, image_urls')
    .in('id', productIds)

  // Create a map for quick lookup
  const productsMap = new Map(
    (productsData || []).map((p: any) => [p.id, p])
  )

  // Combine the data
  return wholesaleData.map((wp: any) => ({
    ...wp,
    product: productsMap.get(wp.product_id) || null,
  })) as WholesaleProduct[]
}

export async function getWholesaleProductsBySupplier(supplierId: string): Promise<WholesaleProduct[]> {
  // First get wholesale products with supplier info
  const { data: wholesaleData, error } = await supabase
    .from(TABLES.products)
    .select(`
      *,
      supplier:wholesale_suppliers(id, name, whatsapp, email)
    `)
    .eq('supplier_id', supplierId)
    .eq('is_active', true)

  if (error) throw error

  if (!wholesaleData || wholesaleData.length === 0) return []

  // Get all product IDs
  const productIds = wholesaleData.map((wp: any) => wp.product_id).filter(Boolean)

  if (productIds.length === 0) return []

  // Fetch the actual products
  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, sku, price, stock, image_urls')
    .in('id', productIds)

  // Create a map for quick lookup
  const productsMap = new Map(
    (productsData || []).map((p: any) => [p.id, p])
  )

  // Combine the data
  return wholesaleData.map((wp: any) => ({
    ...wp,
    product: productsMap.get(wp.product_id) || null,
  })) as WholesaleProduct[]
}

export async function getWholesaleProductByProductId(productId: string): Promise<WholesaleProduct | null> {
  // First get wholesale product with supplier info
  const { data: wholesaleData, error } = await supabase
    .from(TABLES.products)
    .select(`
      *,
      supplier:wholesale_suppliers(id, name, whatsapp, email)
    `)
    .eq('product_id', productId)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !wholesaleData) return null

  // Fetch the actual product
  const { data: productData } = await supabase
    .from('products')
    .select('id, name, sku, price, stock, image_urls')
    .eq('id', productId)
    .maybeSingle()

  return {
    ...wholesaleData,
    product: productData || null,
  } as WholesaleProduct | null
}

export async function createWholesaleProduct(
  product: Omit<WholesaleProduct, 'id' | 'createdAt' | 'updatedAt' | 'product' | 'supplier'>
): Promise<WholesaleProduct> {
  // Insert wholesale product
  const { data, error } = await supabase
    .from(TABLES.products)
    .insert({
      product_id: product.productId,
      supplier_id: product.supplierId,
      supplier_sku: product.supplierSku,
      supplier_cost: product.supplierCost,
      wholesale_price: product.wholesalePrice,
      wholesale_min_qty: product.wholesaleMinQty,
      lead_time: product.leadTime,
      is_active: true,
    })
    .select(`
      *,
      supplier:wholesale_suppliers(id, name, whatsapp, email)
    `)
    .single()

  if (error) throw error

  // Fetch the related product separately
  const { data: productData } = await supabase
    .from('products')
    .select('id, name, sku, price, stock, image_urls')
    .eq('id', product.productId)
    .maybeSingle()

  return {
    ...data,
    product: productData || null,
  } as WholesaleProduct
}

export async function updateWholesaleProduct(id: string, updates: Partial<WholesaleProduct>): Promise<WholesaleProduct> {
  const { data, error } = await supabase
    .from(TABLES.products)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as WholesaleProduct
}

export async function deleteWholesaleProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.products)
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function bulkCreateWholesaleProducts(
  products: Array<{
    productId: string
    supplierId: string
    supplierSku: string | null
    supplierCost: number
    wholesalePrice: number
    wholesaleMinQty: number
    leadTime: string
    isActive: boolean
  }>
): Promise<{ created: number; failed: number; errors: Array<{ productId: string; error: string }> }> {
  const results = await Promise.allSettled(
    products.map((product) =>
      supabase
        .from(TABLES.products)
        .insert({
          product_id: product.productId,
          supplier_id: product.supplierId,
          supplier_sku: product.supplierSku,
          supplier_cost: product.supplierCost,
          wholesale_price: product.wholesalePrice,
          wholesale_min_qty: product.wholesaleMinQty,
          lead_time: product.leadTime,
          is_active: product.isActive,
        })
        .select()
        .single()
    )
  )

  const created = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length
  const errors = results
    .map((r, index) =>
      r.status === 'rejected' && products[index]
        ? { productId: products[index]!.productId, error: String(r.reason) }
        : null
    )
    .filter((e) => e !== null)

  return { created, failed, errors: errors as Array<{ productId: string; error: string }> }
}

// ============================================================================
// PEDIDOS DROPSHIPPING
// ============================================================================

function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `WS-${date}-${random}`
}

export async function getWholesaleOrders(filters?: {
  status?: WholesaleOrder['status']
  supplierId?: string
  limit?: number
  offset?: number
}): Promise<{ orders: WholesaleOrder[]; total: number }> {
  let query = supabase
    .from(TABLES.orders)
    .select('*, supplier:wholesale_suppliers(*)', { count: 'exact' })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.supplierId) {
    query = query.eq('supplier_id', filters.supplierId)
  }

  query = query.order('order_date', { ascending: false })

  if (filters?.limit) {
    const from = filters.offset || 0
    const to = from + filters.limit - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query

  if (error) throw error
  return {
    orders: (data || []) as WholesaleOrder[],
    total: count || 0,
  }
}

export async function getWholesaleOrderById(id: string): Promise<WholesaleOrder | null> {
  const { data, error } = await supabase
    .from(TABLES.orders)
    .select('*, supplier:wholesale_suppliers(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as WholesaleOrder | null
}

export async function createWholesaleOrder(params: {
  customerName: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress: {
    address: string
    city: string
    state: string
    zipCode: string
    country?: string
  }
  items: Array<{
    productId: string
    name: string
    sku: string
    quantity: number
    price: number
  }>
  saleId?: string
  notes?: string
}): Promise<WholesaleOrder> {
  // Para cada item, obtener información de dropshipping
  const itemsWithSupplier = await Promise.all(
    params.items.map(async (item) => {
      const { data } = await supabase
        .from(TABLES.products)
        .select('*, supplier:wholesale_suppliers(*)')
        .eq('product_id', item.productId)
        .eq('is_active', true)
        .single()

      if (!data) {
        throw new Error(`Producto ${item.productId} no tiene configuración de dropshipping`)
      }

      const wp = data as WholesaleProduct & { supplier: WholesaleSupplier }

      return {
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        supplierSku: wp.supplierSku,
        quantity: item.quantity,
        price: item.price,
        supplierCost: wp.supplierCost,
        supplierId: wp.supplierId,
        supplierData: wp.supplier,
      }
    })
  )

  // Agrupar por proveedor
  const groupedBySupplier = itemsWithSupplier.reduce((acc, item) => {
    if (!acc[item.supplierId]) {
      acc[item.supplierId] = {
        supplierId: item.supplierId,
        supplierData: item.supplierData,
        items: [],
        subtotal: 0,
        supplierCost: 0,
      }
    }
    acc[item.supplierId].items.push(item)
    acc[item.supplierId].subtotal += item.price * item.quantity
    acc[item.supplierId].supplierCost += item.supplierCost * item.quantity
    return acc
  }, {} as Record<string, any>)

  // Crear una orden por proveedor
  const orders = await Promise.all(
    Object.values(groupedBySupplier).map(async (group) => {
      const profit = group.subtotal - group.supplierCost

      const { data, error } = await supabase
        .from(TABLES.orders)
        .insert({
          order_number: generateOrderNumber(),
          customer_name: params.customerName,
          customer_email: params.customerEmail,
          customer_phone: params.customerPhone,
          shipping_address: params.shippingAddress,
          supplier_id: group.supplierId,
          sale_id: params.saleId,
          items: group.items.map((i: any) => ({
            product_id: i.productId,
            name: i.name,
            sku: i.sku,
            supplier_sku: i.supplierSku,
            quantity: i.quantity,
            price: i.price,
            supplier_cost: i.supplierCost,
          })),
          subtotal: group.subtotal,
          supplier_cost: group.supplierCost,
          profit: profit,
          status: 'pending',
          notes: params.notes,
        })
        .select('*, supplier:wholesale_suppliers(*)')
        .single()

      if (error) throw error
      return data as WholesaleOrder
    })
  )

  return orders[0] // Retornar la primera orden (principal)
}

export interface SendToSupplierResult {
  sent: boolean
  message?: string
  whatsappUrl?: string
}

export async function sendOrderToSupplier(
  orderId: string,
  method: 'whatsapp' | 'email'
): Promise<SendToSupplierResult> {
  const { data: order } = await supabase
    .from(TABLES.orders)
    .select('*, supplier:wholesale_suppliers(*)')
    .eq('id', orderId)
    .single()

  if (!order) throw new Error('Orden no encontrada')

  const supplier = order.supplier
  const items = order.items as WholesaleOrderItem[]

  // Generar mensaje para WhatsApp
  let message = `📦 *NUEVO PEDIDO DROPSHIPPING*\n\n`
  message += `*Orden:* ${order.orderNumber}\n`
  message += `*Cliente:* ${order.customerName}\n`
  if (order.customerPhone) message += `*Tel:* ${order.customerPhone}\n`
  message += `\n`

  message += `📍 *Dirección de Envío:*\n`
  const addr = order.shippingAddress as any
  message += `${addr.address}\n`
  message += `${addr.city}, ${addr.state}\n`
  message += `CP: ${addr.zipCode}\n\n`

  message += `📦 *Productos:*\n`
  items.forEach((item) => {
    message += `• ${item.name}\n`
    message += `  SKU: ${item.supplierSku || item.sku}\n`
    message += `  Cantidad: ${item.quantity}\n`
    message += `  Precio: $${item.price.toFixed(2)}\n`
  })

  message += `\n💰 *Total: $${order.subtotal.toFixed(2)}*\n`

  if (method === 'whatsapp' && supplier?.whatsapp) {
    const cleanPhone = supplier.whatsapp.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`

    // Actualizar estado
    await supabase
      .from(TABLES.orders)
      .update({
        status: 'sent_to_supplier',
        sent_to_supplier_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return {
      sent: false,
      whatsappUrl,
    }
  }

  if (method === 'email' && supplier?.email) {
    // Aquí podrías integrar un servicio de email
    await supabase
      .from(TABLES.orders)
      .update({
        status: 'sent_to_supplier',
        sent_to_supplier_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return { sent: true }
  }

  return { sent: false, message: 'Método no configurado' }
}

export async function updateWholesaleOrderStatus(
  orderId: string,
  status: WholesaleOrder['status'],
  updates?: {
    supplierOrderNumber?: string
    trackingNumber?: string
    trackingUrl?: string
    notes?: string
    internalNotes?: string
  }
): Promise<WholesaleOrder> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  // Actualizar fechas según estado
  if (status === 'confirmed') {
    updateData.confirmed_at = new Date().toISOString()
  }
  if (status === 'shipped') {
    updateData.shipped_at = new Date().toISOString()
  }
  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  }

  // Agregar updates adicionales
  if (updates) {
    Object.assign(updateData, updates)
  }

  const { data, error } = await supabase
    .from(TABLES.orders)
    .update(updateData)
    .eq('id', orderId)
    .select('*, supplier:wholesale_suppliers(*)')
    .single()

  if (error) throw error
  return data as WholesaleOrder
}

// ============================================================================
// UTILIDADES PARA TIENDA ONLINE
// ============================================================================

export interface WholesaleProductInfo {
  isWholesale: boolean
  wholesaleMinQty: number
  wholesalePrice: number
  leadTime: string
  supplierName: string
}

/**
 * Verifica si un producto tiene configuración dropshipping activa
 */
export async function getWholesaleInfo(productId: string): Promise<WholesaleProductInfo | null> {
  const { data } = await supabase
    .from(TABLES.products)
    .select(`
      *,
      supplier:wholesale_suppliers(id, name, lead_time_default)
    `)
    .eq('product_id', productId)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) return null

  const wp = data as any
  const supplier = wp.supplier as any

  return {
    isWholesale: true,
    wholesaleMinQty: wp.wholesale_min_qty,
    wholesalePrice: wp.wholesale_price,
    leadTime: wp.lead_time || supplier?.lead_time_default || '3-5 días hábiles',
    supplierName: supplier?.name || 'Proveedor',
  }
}

/**
 * Obtiene todos los productos dropshipping con información extendida
 */
export async function getWholesaleCatalog(): Promise<Array<Product & WholesaleProductInfo>> {
  const wholesaleProducts = await getWholesaleProducts()

  return wholesaleProducts
    .filter((wp) => Boolean((wp.product as any)?.id))
    .map((wp) => {
      const product = wp.product as any
      return {
    id: product.id,
    name: product.name,
    sku: product.sku || '',
    price: product.price || 0,
    cost: 0, // No relevante para dropshipping
    stock: 0, // Siempre 0 para dropshipping
    createdAt: new Date(),
    type: 'Venta' as const,
    ownershipType: 'Propio' as const,
    imageUrls: product.imageUrls || product.image_urls || [],
    // Info dropshipping
    isWholesale: true,
    wholesaleMinQty: wp.wholesaleMinQty,
    wholesalePrice: wp.wholesalePrice,
    leadTime: wp.leadTime || wp.supplier?.leadTimeDefault || '3-5 días hábiles',
    supplierName: wp.supplier?.name || 'Proveedor',
  }})
}
