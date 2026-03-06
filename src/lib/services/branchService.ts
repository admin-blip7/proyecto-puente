import { supabase } from '@/lib/supabaseClient'
import { Branch, BranchStock, BranchStockWithProduct, CreateBranchDTO, UpdateBranchDTO, StoreStock, Partner, PartnerStats } from '@/types'

const TABLES = {
  branches: 'branches',
  branchStock: 'branch_stock',
  partners: 'partners',
  products: 'products',
} as const

// Helper para asegurar que supabase esté definido
function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  return supabase
}

// ============================================================================
// MAPEO DE DATOS
// ============================================================================

const mapBranch = (row: any): Branch => ({
  id: row?.id ?? '',
  partnerId: row?.partner_id ?? '',
  name: row?.name ?? '',
  code: row?.code,
  address: row?.address,
  city: row?.city,
  state: row?.state,
  zipCode: row?.zip_code,
  country: row?.country,
  isMain: row?.is_main ?? false,
  isActive: row?.is_active ?? true,
  managerName: row?.manager_name,
  managerPhone: row?.manager_phone,
  managerEmail: row?.manager_email,
  businessHours: row?.business_hours,
  createdAt: new Date(row?.created_at ?? Date.now()),
  updatedAt: new Date(row?.updated_at ?? Date.now()),
})

const mapBranchStock = (row: any): BranchStock => ({
  id: row?.id ?? '',
  branchId: row?.branch_id ?? '',
  productId: row?.product_id ?? '',
  quantity: Number(row?.quantity ?? 0),
  reserved: Number(row?.reserved ?? 0),
  available: Number(row?.available ?? 0),
  costOverride: row?.cost_override ? Number(row.cost_override) : undefined,
  priceOverride: row?.price_override ? Number(row.price_override) : undefined,
  location: row?.location,
  publishedToStore: row?.published_to_store ?? false,
  storeApprovedAt: row?.store_approved_at ? new Date(row.store_approved_at) : undefined,
  storeApprovedBy: row?.store_approved_by,
  lastStockUpdate: new Date(row?.last_stock_update ?? Date.now()),
  lastSaleAt: row?.last_sale_at ? new Date(row.last_sale_at) : undefined,
  createdAt: new Date(row?.created_at ?? Date.now()),
  updatedAt: new Date(row?.updated_at ?? Date.now()),
})

const mapPartner = (row: any): Partner | null => {
  if (!row) return null
  return {
    id: row?.id ?? '',
    name: row?.name ?? '',
    slug: row?.slug,
    contactName: row?.contact_name,
    email: row?.email,
    phone: row?.phone,
    address: row?.address,
    commissionRate: row?.commission_rate ?? 0.15,
    paymentMethod: row?.payment_method,
    paymentData: row?.payment_data,
    communityEnabled: row?.community_enabled ?? false,
    allowBranchTransfers: row?.allow_branch_transfers ?? true,
    allowCrossBranchSelling: row?.allow_cross_branch_selling ?? true,
    maxMonthlySales: row?.max_monthly_sales ?? 0,
    creditLimit: row?.credit_limit ?? 0,
    isActive: row?.is_active ?? true,
    settings: row?.settings,
    createdAt: new Date(row?.created_at ?? Date.now()),
    updatedAt: new Date(row?.updated_at ?? Date.now()),
  }
}

// ============================================================================
// GESTIÓN DE SUCURSALES
// ============================================================================

export async function getBranches(partnerId?: string, includeInactive = false): Promise<Branch[]> {
  const sb = getSupabase()
  let query = sb
    .from(TABLES.branches)
    .select('*')
    .order('is_main', { ascending: false })
    .order('name', { ascending: true })

  if (partnerId) {
    query = query.eq('partner_id', partnerId)
  }

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map(mapBranch)
}

/**
 * Gets the default branch for a partner (prioritizing the main branch)
 */
export async function getDefaultBranchForPartner(partnerId: string): Promise<Branch | null> {
  try {
    const branches = await getBranches(partnerId, false);
    return branches.length > 0 ? branches[0] : null;
  } catch (error) {
    console.error("Error fetching default branch for partner:", error);
    return null;
  }
}

// Alias para compatibilidad con el dashboard del socio
export { getBranches as getPartnerBranches }

export async function getBranchById(id: string): Promise<Branch | null> {
  const { data, error } = await getSupabase()
    .from(TABLES.branches)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return mapBranch(data)
}

export async function createBranch(partnerId: string, dto: CreateBranchDTO): Promise<Branch> {
  const payload: any = {
    partner_id: partnerId,
    name: dto.name,
    code: dto.code,
    address: dto.address,
    city: dto.city,
    state: dto.state,
    zip_code: dto.zipCode,
    manager_name: dto.managerName,
    manager_phone: dto.managerPhone,
    manager_email: dto.managerEmail,
    is_main: dto.isMain ?? false,
    business_hours: dto.businessHours ?? {},
    is_active: true,
  }

  const { data, error } = await getSupabase()
    .from(TABLES.branches)
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error

  return mapBranch(data)
}

export async function updateBranch(id: string, dto: UpdateBranchDTO): Promise<Branch> {
  const payload: any = {}

  if (dto.name !== undefined) payload.name = dto.name
  if (dto.code !== undefined) payload.code = dto.code
  if (dto.address !== undefined) payload.address = dto.address
  if (dto.city !== undefined) payload.city = dto.city
  if (dto.state !== undefined) payload.state = dto.state
  if (dto.zipCode !== undefined) payload.zip_code = dto.zipCode
  if (dto.managerName !== undefined) payload.manager_name = dto.managerName
  if (dto.managerPhone !== undefined) payload.manager_phone = dto.managerPhone
  if (dto.managerEmail !== undefined) payload.manager_email = dto.managerEmail
  if (dto.isMain !== undefined) payload.is_main = dto.isMain
  if (dto.businessHours !== undefined) payload.business_hours = dto.businessHours

  const { data, error } = await getSupabase()
    .from(TABLES.branches)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return mapBranch(data)
}

export async function deleteBranch(id: string): Promise<void> {
  // Soft delete
  const { error } = await getSupabase()
    .from(TABLES.branches)
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// STOCK POR SUCURSAL
// ============================================================================

export async function getBranchStock(branchId: string): Promise<BranchStockWithProduct[]> {
  const { data: stockData, error: stockError } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`*`)
    .eq('branch_id', branchId)
    .order('last_stock_update', { ascending: false })

  if (stockError) throw stockError

  const branchStocks = (stockData || []).map(row => mapBranchStock(row))

  // Obtener los productos correspondientes
  const productIds = Array.from(new Set(branchStocks.map(s => s.productId)))

  if (productIds.length === 0) {
    return []
  }

  const { data: productsData, error: productsError } = await getSupabase()
    .from(TABLES.products)
    .select('id, name, sku, price, category, image_urls')
    .in('id', productIds)

  if (productsError) throw productsError

  const productsMap = new Map(productsData?.map(p => [p.id, p]))

  return branchStocks.map(stock => ({
    ...stock,
    product: productsMap.get(stock.productId) as any
  }))
}

/**
 * Obtiene el stock completo (sin agrupar) de un socio
 * Para usar en reportes y vistas detalladas
 */
export async function getPartnerStockDetailed(partnerId: string): Promise<BranchStockWithProduct[]> {
  const { data: stockData, error: stockError } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      *,
      branch:branches!inner(id, name, partner_id)
    `)
    .eq('branch.partner_id', partnerId)
    .order('last_stock_update', { ascending: false })

  if (stockError) throw stockError

  const branchStocksAndBranches = (stockData || []).map((row: any) => ({
    stock: mapBranchStock(row),
    branch: typeof row.branch === 'object' ? row.branch : undefined
  }))

  const productIds = Array.from(new Set(branchStocksAndBranches.map(item => item.stock.productId)))

  if (productIds.length === 0) {
    return []
  }

  const { data: productsData, error: productsError } = await getSupabase()
    .from(TABLES.products)
    .select('id, name, sku, price, category, image_urls')
    .in('id', productIds)

  if (productsError) throw productsError

  const productsMap = new Map(productsData?.map(p => [p.id, p]))

  return branchStocksAndBranches.map(item => ({
    ...item.stock,
    product: productsMap.get(item.stock.productId) as any,
    branch: item.branch
  }))
}

export async function getProductStockAcrossBranches(productId: string): Promise<BranchStock[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      *,
      branch:branches(id, name, partner_id, is_main)
    `)
    .eq('product_id', productId)
    .gt('available', 0)
    .order('available', { ascending: false })

  if (error) throw error

  return (data || []).map(mapBranchStock)
}

export async function getStockAcrossBranches(partnerId: string, productId: string): Promise<BranchStock[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      *,
      branch:branches(id, name, partner_id),
      product:products(id, name, price)
    `)
    .eq('product_id', productId)
    .eq('branch.partner_id', partnerId)
    .order('available', { ascending: false })

  if (error) throw error

  return (data || []).map(mapBranchStock)
}

export async function updateBranchStock(
  branchId: string,
  productId: string,
  quantity: number,
  reserved = 0,
  serverClient?: any
): Promise<BranchStock> {
  // Upsert branch_stock
  const payload: any = {
    branch_id: branchId,
    product_id: productId,
    quantity,
    reserved,
    last_stock_update: new Date().toISOString(),
  }

  const sb = serverClient || getSupabase()

  const { data, error } = await sb
    .from(TABLES.branchStock)
    .upsert(payload, {
      onConflict: 'branch_id,product_id',
      ignoreDuplicates: false,
    })
    .select('*')
    .single()

  if (error) throw error

  return mapBranchStock(data)
}

export async function adjustBranchStock(
  branchId: string,
  productId: string,
  adjustment: number,
  serverClient?: any
): Promise<BranchStock> {
  const sb = serverClient || getSupabase()

  // Obtener stock actual
  const { data: current } = await sb
    .from(TABLES.branchStock)
    .select('*')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .maybeSingle()

  const currentQuantity = current?.quantity ?? 0
  const currentReserved = current?.reserved ?? 0
  const newQuantity = Math.max(0, currentQuantity + adjustment)

  return updateBranchStock(branchId, productId, newQuantity, currentReserved, serverClient)
}

// ============================================================================
// APROBACIÓN PARA TIENDA ONLINE
// ============================================================================

export async function getPendingStoreApproval(): Promise<BranchStockWithProduct[]> {
  // First get branch stock with branch info (which includes partner_id)
  const { data: stockData, error: stockError } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      *,
      branch:branches(id, name, partner_id)
    `)
    .eq('published_to_store', false)
    .gt('available', 0)
    .order('last_stock_update', { ascending: false })

  if (stockError) throw stockError

  // Get unique partner IDs from branches
  const partnerIds = [...new Set((stockData || []).map(item => item.branch?.partner_id).filter(Boolean))]

  // Fetch all partners
  const { data: partners } = await getSupabase()
    .from(TABLES.partners)
    .select('id, name, slug, contact_name, email, phone, address, commission_rate, payment_method, payment_data, community_enabled, allow_branch_transfers, allow_cross_branch_selling, max_monthly_sales, credit_limit, is_active, settings, created_at, updated_at')
    .in('id', partnerIds.length > 0 ? partnerIds : [''])

  const partnersMap = new Map((partners || []).map(p => [p.id, p]))

  // Get unique product IDs
  const productIds = [...new Set((stockData || []).map(item => item.product_id))]

  // Fetch all products
  const { data: products } = await getSupabase()
    .from(TABLES.products)
    .select('id, name, sku, price, image_urls, category')
    .in('id', productIds.length > 0 ? productIds : [''])

  const productsMap = new Map((products || []).map(p => [p.id, p]))

  return (stockData || []).map((row: any) => ({
    ...mapBranchStock(row),
    product: productsMap.get(row.product_id) || {} as any,
    branch: mapBranch(row.branch),
    partner: row.branch?.partner_id ? mapPartner(partnersMap.get(row.branch.partner_id)) : null,
  }))
}

export async function getApprovedStoreStock(): Promise<BranchStockWithProduct[]> {
  // First get branch stock with branch info (which includes partner_id)
  const { data: stockData, error: stockError } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      *,
      branch:branches(id, name, partner_id)
    `)
    .eq('published_to_store', true)
    .gt('available', 0)
    .order('store_approved_at', { ascending: false })

  if (stockError) throw stockError

  // Get unique partner IDs from branches
  const partnerIds = [...new Set((stockData || []).map(item => item.branch?.partner_id).filter(Boolean))]

  // Fetch all partners
  const { data: partners } = await getSupabase()
    .from(TABLES.partners)
    .select('id, name, slug, contact_name, email, phone, address, commission_rate, payment_method, payment_data, community_enabled, allow_branch_transfers, allow_cross_branch_selling, max_monthly_sales, credit_limit, is_active, settings, created_at, updated_at')
    .in('id', partnerIds.length > 0 ? partnerIds : [''])

  const partnersMap = new Map((partners || []).map(p => [p.id, p]))

  // Get unique product IDs
  const productIds = [...new Set((stockData || []).map(item => item.product_id))]

  // Fetch all products
  const { data: products } = await getSupabase()
    .from(TABLES.products)
    .select('id, name, sku, price, image_urls, category')
    .in('id', productIds.length > 0 ? productIds : [''])

  const productsMap = new Map((products || []).map(p => [p.id, p]))

  return (stockData || []).map((row: any) => ({
    ...mapBranchStock(row),
    product: productsMap.get(row.product_id) || {} as any,
    branch: mapBranch(row.branch),
    partner: row.branch?.partner_id ? mapPartner(partnersMap.get(row.branch.partner_id)) : null,
  }))
}

export async function approveStoreStock(
  branchId: string,
  productId: string,
  adminId: string
): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLES.branchStock)
    .update({
      published_to_store: true,
      store_approved_at: new Date().toISOString(),
      store_approved_by: adminId,
    })
    .eq('branch_id', branchId)
    .eq('product_id', productId)

  if (error) throw error
}

export async function disapproveStoreStock(branchId: string, productId: string): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLES.branchStock)
    .update({
      published_to_store: false,
      store_approved_at: null,
      store_approved_by: null,
    })
    .eq('branch_id', branchId)
    .eq('product_id', productId)

  if (error) throw error
}

export async function bulkApproveStoreStock(
  items: Array<{ branchId: string; productId: string }>,
  adminId: string
): Promise<{ approved: number; failed: number }> {
  const results = await Promise.allSettled(
    items.map(item =>
      approveStoreStock(item.branchId, item.productId, adminId)
    )
  )

  const approved = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return { approved, failed }
}

export async function bulkDisapproveStoreStock(
  items: Array<{ branchId: string; productId: string }>
): Promise<{ disapproved: number; failed: number }> {
  const results = await Promise.allSettled(
    items.map(item =>
      disapproveStoreStock(item.branchId, item.productId)
    )
  )

  const disapproved = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return { disapproved, failed }
}

/**
 * Obtiene el stock disponible para mostrar en la tienda online
 * Incluye stock propio del Master + stock de socios aprobado
 */
export async function getStoreStockForProduct(productId: string): Promise<StoreStock[]> {
  const result: StoreStock[] = []

  // 1. Stock de socios aprobado para tienda online
  const { data: partnerStock, error: partnerError } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      available,
      store_approved_at,
      branch:branches(id, name, partner_id),
      partner:partners(id, name)
    `)
    .eq('product_id', productId)
    .eq('published_to_store', true)
    .gt('available', 0)

  if (!partnerError && partnerStock) {
    for (const row of partnerStock as any[]) {
      const branch = row.branch as any | null
      const partner = row.partner as any | null
      result.push({
        productId,
        productName: '',
        productSku: '',
        origin: 'partner',
        partnerId: partner?.id,
        partnerName: partner?.name,
        branchId: branch?.id,
        branchName: branch?.name,
        available: Number(row.available),
        storeApprovedAt: row.store_approved_at ? new Date(row.store_approved_at) : undefined,
      })
    }
  }

  // 2. Stock propio del Master (productos sin partner_id)
  const { data: masterProduct, error: masterError } = await getSupabase()
    .from(TABLES.products)
    .select('id, name, sku, price, stock, image_urls')
    .eq('id', productId)
    .maybeSingle()

  if (!masterError && masterProduct && masterProduct.stock > 0) {
    result.push({
      productId,
      productName: masterProduct.name,
      productSku: masterProduct.sku,
      productPrice: masterProduct.price,
      productImageUrls: masterProduct.image_urls,
      origin: 'master',
      available: Number(masterProduct.stock),
    })
  }

  return result
}

/**
 * Obtiene todo el stock disponible para la tienda online
 * Útil para el catálogo de productos
 */
export async function getAllStoreStock(options?: {
  partnerId?: string
  category?: string
  minStock?: number
}): Promise<StoreStock[]> {
  const result: StoreStock[] = []

  // 1. Stock de socios aprobado
  let partnerQuery = getSupabase()
    .from(TABLES.branchStock)
    .select(`
      product_id,
      available,
      store_approved_at,
      branch:branches(id, name, partner_id),
      partner:partners(id, name)
    `)
    .eq('published_to_store', true)
    .gt('available', 0)

  if (options?.partnerId) {
    partnerQuery = partnerQuery.eq('branch.partner_id', options.partnerId)
  }

  if (options?.minStock) {
    partnerQuery = partnerQuery.gte('available', options.minStock)
  }

  const { data: partnerStock, error: partnerError } = await partnerQuery

  if (!partnerError && partnerStock) {
    // Get unique product IDs
    const productIds = [...new Set(partnerStock.map((item: any) => item.product_id))]

    // Fetch products
    const { data: products } = await getSupabase()
      .from(TABLES.products)
      .select('id, name, sku, price, image_urls, category')
      .in('id', productIds.length > 0 ? productIds : [''])

    const productsMap = new Map((products || []).map((p: any) => [p.id, p]))

    for (const row of partnerStock as any[]) {
      const product = productsMap.get(row.product_id)
      if (options?.category && product?.category !== options.category) continue

      const branch = row.branch as any | null
      const partner = row.partner as any | null

      result.push({
        productId: row.product_id,
        productName: product?.name || '',
        productSku: product?.sku,
        productPrice: product?.price,
        productImageUrls: product?.image_urls,
        origin: 'partner',
        partnerId: partner?.id,
        partnerName: partner?.name,
        branchId: branch?.id,
        branchName: branch?.name,
        available: Number(row.available),
        storeApprovedAt: row.store_approved_at ? new Date(row.store_approved_at) : undefined,
      })
    }
  }

  // 2. Stock propio del Master
  let masterQuery = getSupabase()
    .from(TABLES.products)
    .select('id, name, sku, price, stock, image_urls, category')
    .gt('stock', 0)

  if (options?.category) {
    masterQuery = masterQuery.eq('category', options.category)
  }

  if (options?.minStock) {
    masterQuery = masterQuery.gte('stock', options.minStock)
  }

  const { data: masterProducts, error: masterError } = await masterQuery

  if (!masterError && masterProducts) {
    for (const product of masterProducts) {
      result.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productPrice: product.price,
        productImageUrls: product.image_urls,
        origin: 'master',
        available: Number(product.stock),
      })
    }
  }

  return result
}

// ============================================================================
// PRODUCTOS DE UN SOCIO
// ============================================================================

export async function getPartnerProducts(partnerId: string): Promise<BranchStock[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      *
    `)
    .eq('branch.partner_id', partnerId)
    .gt('available', 0)
    .order('available', { ascending: false })

  if (error) throw error

  return (data || []).map(mapBranchStock)
}

// ============================================================================
// ESTADÍSTICAS DE SOCIO
// ============================================================================

// PartnerStats is now imported from @/types via index.ts

export async function getPartnerStats(partnerId: string): Promise<PartnerStats> {
  // Get partner info
  const { data: partner, error: partnerError } = await getSupabase()
    .from(TABLES.partners)
    .select('id, name')
    .eq('id', partnerId)
    .single()
  if (partnerError && partnerError.code !== 'PGRST116') throw partnerError

  // Get branches count
  const { count: branchesCount, error: branchesCountError } = await getSupabase()
    .from(TABLES.branches)
    .select('*', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('is_active', true)
  if (branchesCountError) throw branchesCountError

  // Get stock data
  const { data: stockData, error: stockDataError } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      product_id,
      available,
      branch:branches!inner(id, partner_id)
    `)
    .eq('branch.partner_id', partnerId)
    .gt('available', 0)
  if (stockDataError) throw stockDataError

  // Get product prices
  const productIds = [...new Set((stockData || []).map(item => item.product_id))]
  const { data: products, error: productsError } = await getSupabase()
    .from(TABLES.products)
    .select('id, price')
    .in('id', productIds.length > 0 ? productIds : [''])
  if (productsError) throw productsError

  const productsMap = new Map((products || []).map(p => [p.id, p.price]))

  const uniqueProducts = new Set()
  let totalStock = 0
  let totalValue = 0

  for (const item of stockData || []) {
    if (item.product_id) uniqueProducts.add(item.product_id)
    totalStock += Number(item.available || 0)
    totalValue += Number(item.available || 0) * Number(productsMap.get(item.product_id) || 0)
  }

  return {
    partnerId: partner?.id || partnerId,
    partnerName: partner?.name || 'Socio',
    branchesCount: branchesCount || 0,
    totalProducts: uniqueProducts.size,
    totalStock,
    totalValue,
  }
}

// ============================================================================
// PRODUCT STOCK (para vista consolidada de socio)
// ============================================================================

export interface ProductStock {
  id?: string
  productId: string
  branchId: string
  available: number
  product?: {
    id: string
    name: string
    sku: string
    price: number
    image_urls?: string[]
  }
  branches?: Array<{
    branchId: string
    branchName: string
    available: number
  }>
}

/**
 * Obtiene el stock consolidado de un socio (agrupado por producto)
 */
export async function getPartnerStock(partnerId: string): Promise<ProductStock[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.branchStock)
    .select(`
      id,
      product_id,
      branch_id,
      available,
      branch:branches(id, name)
    `)
    .eq('branch.partner_id', partnerId)
    .gt('available', 0)
    .order('product_id', { ascending: true })

  if (error) throw error

  // Get unique product IDs
  const productIds = [...new Set((data || []).map(item => item.product_id))]

  // Fetch products
  const { data: products } = await getSupabase()
    .from(TABLES.products)
    .select('id, name, sku, price, image_urls')
    .in('id', productIds.length > 0 ? productIds : [''])

  const productsMap = new Map((products || []).map(p => [p.id, p]))

  // Group by product
  const grouped = new Map<string, ProductStock>()

  for (const row of data || []) {
    const productId = row.product_id
    const branchId = row.branch_id

    if (!grouped.has(productId)) {
      const branch = row.branch as any | null
      grouped.set(productId, {
        id: row.id,
        productId,
        branchId,
        available: Number(row.available || 0),
        product: productsMap.get(productId),
        branches: [
          {
            branchId,
            branchName: branch?.name || branchId,
            available: Number(row.available || 0),
          },
        ],
      })
    } else {
      const existing = grouped.get(productId)!
      const branch = row.branch as any | null
      existing.available += Number(row.available || 0)
      existing.branches?.push({
        branchId,
        branchName: branch?.name || branchId,
        available: Number(row.available || 0),
      })
    }
  }

  return Array.from(grouped.values())
}
