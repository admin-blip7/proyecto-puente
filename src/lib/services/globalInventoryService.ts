import { supabase } from '@/lib/supabaseClient'
import { GlobalInventoryStats, BranchStockWithProduct, Partner, Branch, Product } from '@/types'

const TABLES = {
  products: 'products',
  branchStock: 'branch_stock',
  branches: 'branches',
  partners: 'partners',
} as const

/**
 * Obtiene estadísticas globales de inventario para el Dashboard Maestro
 * Incluye datos de Master (productos sin partner_id) y todos los socios
 */
export async function getGlobalInventoryStats(): Promise<GlobalInventoryStats> {
  // 1. Obtener todos los socios activos
  const { data: partners, error: partnersError } = await supabase
    .from(TABLES.partners)
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (partnersError) throw partnersError

  // 2. Obtener todo el stock de branch_stock (de socios)
  const { data: branchStock, error: stockError } = await supabase
    .from(TABLES.branchStock)
    .select(`
      product_id,
      available,
      branch:branches!inner(id, partner_id)
    `)
    .gt('available', 0)

  if (stockError) throw stockError

  // 3. Obtener productos con precios para calcular valor
  const productIds = [...new Set(branchStock?.map(bs => bs.product_id) || [])]
  const { data: products, error: productsError } = await supabase
    .from(TABLES.products)
    .select('id, price, cost, category')
    .in('id', productIds.length > 0 ? productIds : [''])

  if (productsError) throw productsError

  const productsMap = new Map(products?.map(p => [p.id, p]) || [])

  // 4. Calcular estadísticas por socio
  const partnerStatsMap = new Map<string, {
    partnerId: string
    partnerName: string
    productCount: number
    stockCount: number
    value: number
  }>()

  const categoryStatsMap = new Map<string, {
    category: string
    productCount: number
    value: number
  }>()

  let totalPartnerProducts = 0
  let totalPartnerStock = 0
  let totalPartnerValue = 0

  for (const stockItem of branchStock || []) {
    const branch = stockItem.branch as any
    const partnerId = branch?.partner_id
    if (!partnerId) continue

    const product = productsMap.get(stockItem.product_id)
    const value = (Number(stockItem.available) || 0) * Number(product?.price || 0)

    // Stats por socio
    if (!partnerStatsMap.has(partnerId)) {
      const partner = partners?.find(p => p.id === partnerId)
      partnerStatsMap.set(partnerId, {
        partnerId,
        partnerName: partner?.name || 'Desconocido',
        productCount: 0,
        stockCount: 0,
        value: 0,
      })
    }

    const stats = partnerStatsMap.get(partnerId)!
    stats.productCount += 1
    stats.stockCount += Number(stockItem.available) || 0
    stats.value += value

    // Stats por categoría
    const category = product?.category || 'Sin categoría'
    if (!categoryStatsMap.has(category)) {
      categoryStatsMap.set(category, {
        category,
        productCount: 0,
        value: 0,
      })
    }

    const catStats = categoryStatsMap.get(category)!
    catStats.productCount += 1
    catStats.value += value

    totalPartnerProducts += 1
    totalPartnerStock += Number(stockItem.available) || 0
    totalPartnerValue += value
  }

  // 5. Obtener estadísticas de productos Master (sin partner_id)
  const { count: masterProductCount, error: masterError } = await supabase
    .from(TABLES.products)
    .select('*', { count: 'exact', head: true })
    .is('partner_id', null)
    .gt('stock', 0)

  const { data: masterProducts, error: masterDataError } = await supabase
    .from(TABLES.products)
    .select('stock, price, cost, category')
    .is('partner_id', null)
    .gt('stock', 0)

  let masterStock = 0
  let masterValue = 0

  if (!masterDataError && masterProducts) {
    for (const p of masterProducts) {
      const stock = Number(p.stock) || 0
      const price = Number(p.price) || 0
      masterStock += stock
      masterValue += stock * price

      // Agregar a categorías
      const category = p.category || 'Sin categoría'
      if (!categoryStatsMap.has(category)) {
        categoryStatsMap.set(category, {
          category,
          productCount: 0,
          value: 0,
        })
      }

      const catStats = categoryStatsMap.get(category)!
      catStats.productCount += 1
      catStats.value += stock * price
    }
  }

  return {
    totalProducts: (masterProductCount || 0) + totalPartnerProducts,
    totalStock: masterStock + totalPartnerStock,
    totalValue: masterValue + totalPartnerValue,
    byPartner: Array.from(partnerStatsMap.values()).sort((a, b) => b.value - a.value),
    byCategory: Array.from(categoryStatsMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    masterProducts: masterProductCount || 0,
    masterStock,
    masterValue,
  }
}

/**
 * Obtiene el inventario global con filtros opcionales
 */
export async function getGlobalInventory(filters?: {
  partnerId?: string
  category?: string
  minStock?: number
  search?: string
  limit?: number
  offset?: number
}): Promise<{
  items: Array<{
    product: Product
    partner?: Partner
    branch?: Branch
    stock: number
    value: number
    origin: 'master' | 'partner'
  }>
  total: number
}> {
  // TODO: Implementar con paginación y filtros
  // Por ahora, estructura básica

  return {
    items: [],
    total: 0,
  }
}

/**
 * Obtiene productos creados por usuario (para auditoría)
 */
export async function getProductsByCreator(filters?: {
  userId?: string
  partnerId?: string
  dateFrom?: Date
  dateTo?: Date
}): Promise<Array<{
  productId: string
  productName: string
  sku: string
  creatorName: string
  creatorEmail: string
  partnerName?: string
  createdAt: Date
}>> {
  let query = supabase
    .from(TABLES.products)
    .select(`
      id,
      name,
      sku,
      created_at,
      created_by,
      partner_id,
      partner:partners(id, name),
      creator:profiles!left(id, name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.userId) {
    query = query.eq('created_by', filters.userId)
  }

  if (filters?.partnerId) {
    query = query.eq('partner_id', filters.partnerId)
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom.toISOString())
  }

  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error('Error getting products by creator:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    productId: row.id,
    productName: row.name,
    sku: row.sku,
    creatorName: row.creator?.name || row.creator?.email?.split('@')[0] || 'Desconocido',
    creatorEmail: row.creator?.email || '',
    partnerName: row.partner?.name,
    createdAt: new Date(row.created_at),
  }))
}

/**
 * Obtiene estadísticas de creación de productos por socio
 */
export async function getPartnerCreationStats(partnerId?: string): Promise<Array<{
  partnerId: string
  partnerName: string
  productCount: number
  lastProductCreatedAt?: Date
}>> {
  let query = supabase
    .from(TABLES.products)
    .select('partner_id, created_at, partner:partners(id, name)')
    .not('partner_id', 'is', null)
    .order('created_at', { ascending: false })

  if (partnerId) {
    query = query.eq('partner_id', partnerId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error getting partner creation stats:', error)
    return []
  }

  // Agrupar por socio
  const statsMap = new Map<string, {
    partnerId: string
    partnerName: string
    productCount: number
    lastProductCreatedAt?: Date
  }>()

  for (const row of data || []) {
    const p = row.partner as any
    if (!p?.id) continue

    if (!statsMap.has(p.id)) {
      statsMap.set(p.id, {
        partnerId: p.id,
        partnerName: p.name,
        productCount: 0,
        lastProductCreatedAt: undefined,
      })
    }

    const stats = statsMap.get(p.id)!
    stats.productCount += 1
    if (!stats.lastProductCreatedAt || new Date(row.created_at) > stats.lastProductCreatedAt) {
      stats.lastProductCreatedAt = new Date(row.created_at)
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => b.productCount - a.productCount)
}
