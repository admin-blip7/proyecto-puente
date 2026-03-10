import { supabase } from '@/lib/supabaseClient'
import { Community, BranchCommunityShare, CreateCommunityDTO, ShareConfig } from '@/types'

const TABLES = {
  communities: 'community_config',
  shares: 'branch_community_shares',
  branches: 'branches',
  partners: 'partners',
} as const

// ============================================================================
// MAPEO DE DATOS
// ============================================================================

const mapCommunity = (row: any): Community => ({
  id: row?.id ?? '',
  name: row?.name ?? '',
  description: row?.description,
  partners: row?.partners ?? [],
  allowView: row?.allow_view ?? true,
  allowReserve: row?.allow_reserve ?? false,
  allowSell: row?.allow_sell ?? false,
  isActive: row?.is_active ?? true,
  createdAt: new Date(row?.created_at ?? Date.now()),
})

const mapBranchCommunityShare = (row: any): BranchCommunityShare => ({
  id: row?.id ?? '',
  branchId: row?.branch_id ?? '',
  communityId: row?.community_id ?? '',
  shareType: row?.share_type ?? 'all',
  productIds: row?.product_ids ?? [],
  allowView: row?.allow_view ?? true,
  allowReserve: row?.allow_reserve ?? false,
  allowTransfer: row?.allow_transfer ?? false,
  isActive: row?.is_active ?? true,
  createdAt: new Date(row?.created_at ?? Date.now()),
})

// ============================================================================
// COMUNIDADES
// ============================================================================

export async function getCommunities(includeInactive = false): Promise<Community[]> {
  let query = supabase
    .from(TABLES.communities)
    .select('*')
    .order('name', { ascending: true })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map(mapCommunity)
}

export async function getCommunityById(id: string): Promise<Community | null> {
  const { data, error } = await supabase
    .from(TABLES.communities)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return mapCommunity(data)
}

export async function createCommunity(dto: CreateCommunityDTO): Promise<Community> {
  const payload: any = {
    name: dto.name,
    description: dto.description,
    partners: dto.partners,
    allow_view: dto.allowView ?? true,
    allow_reserve: dto.allowReserve ?? false,
    allow_sell: dto.allowSell ?? false,
    is_active: true,
  }

  const { data, error } = await supabase
    .from(TABLES.communities)
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error

  return mapCommunity(data)
}

export async function updateCommunity(
  id: string,
  dto: Partial<CreateCommunityDTO>
): Promise<Community> {
  const payload: any = {}

  if (dto.name !== undefined) payload.name = dto.name
  if (dto.description !== undefined) payload.description = dto.description
  if (dto.partners !== undefined) payload.partners = dto.partners
  if (dto.allowView !== undefined) payload.allow_view = dto.allowView
  if (dto.allowReserve !== undefined) payload.allow_reserve = dto.allowReserve
  if (dto.allowSell !== undefined) payload.allow_sell = dto.allowSell

  const { data, error } = await supabase
    .from(TABLES.communities)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return mapCommunity(data)
}

export async function deleteCommunity(id: string): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from(TABLES.communities)
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// SHARES (SUCURSALES COMPARTIDAS)
// ============================================================================

export async function getBranchShares(communityId: string): Promise<BranchCommunityShare[]> {
  const { data, error } = await supabase
    .from(TABLES.shares)
    .select(`
      *,
      branch:branches(id, name, partner_id),
      community:community_config(id, name)
    `)
    .eq('community_id', communityId)
    .eq('is_active', true)

  if (error) throw error

  return (data || []).map(mapBranchCommunityShare)
}

export async function getBranchShare(
  branchId: string,
  communityId: string
): Promise<BranchCommunityShare | null> {
  const { data, error } = await supabase
    .from(TABLES.shares)
    .select('*')
    .eq('branch_id', branchId)
    .eq('community_id', communityId)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data ? mapBranchCommunityShare(data) : null
}

export async function shareBranchInCommunity(
  branchId: string,
  communityId: string,
  config: ShareConfig
): Promise<BranchCommunityShare> {
  const payload: any = {
    branch_id: branchId,
    community_id: communityId,
    share_type: config.shareType || 'all',
    product_ids: config.productIds || [],
    allow_view: config.allowView ?? true,
    allow_reserve: config.allowReserve ?? false,
    allow_transfer: config.allowTransfer ?? false,
    is_active: true,
  }

  const { data, error } = await supabase
    .from(TABLES.shares)
    .upsert(payload, {
      onConflict: 'branch_id,community_id',
      ignoreDuplicates: false,
    })
    .select('*')
    .single()

  if (error) throw error

  return mapBranchCommunityShare(data)
}

export async function removeBranchFromCommunity(
  branchId: string,
  communityId: string
): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from(TABLES.shares)
    .update({ is_active: false })
    .eq('branch_id', branchId)
    .eq('community_id', communityId)

  if (error) throw error
}

// ============================================================================
// STOCK DE COMUNIDAD
// ============================================================================

export async function getCommunityStock(
  communityId: string,
  productId?: string
): Promise<Array<{
  branchId: string
  branchName: string
  partnerId: string
  partnerName: string
  productId: string
  productName: string
  available: number
}>> {
  // Obtener sucursales que comparten en esta comunidad
  const shares = await getBranchShares(communityId)

  const result: any[] = []

  for (const share of shares) {
    // Obtener stock de la sucursal
    let query = supabase
      .from('branch_stock')
      .select('available, product_id, product:products(id, name)')
      .eq('branch_id', share.branchId)
      .gt('available', 0)

    if (productId) {
      query = query.eq('product_id', productId)
    }

    const { data: stock } = await query

    if (stock) {
      for (const item of stock as any[]) {
        const product = item.product as any
        // Si es share_type 'selected', verificar que el producto esté en la lista
        if (share.shareType === 'selected' && !share.productIds.includes(item.product_id)) {
          continue
        }

        result.push({
          branchId: share.branchId,
          branchName: share.branch?.name || '',
          partnerId: share.branch?.partnerId || '',
          partnerName: '', // Se llenaría con join
          productId: item.product_id,
          productName: Array.isArray(product)
            ? product[0]?.name || ''
            : product?.name || '',
          available: Number(item.available),
        })
      }
    }
  }

  return result
}

/**
 * Obtiene el inventario comunitario GLOBAL de todos los socios que han sido habilitados
 * para compartir su inventario en el mercado interno
 */
export async function getGlobalCommunityStock(productId?: string): Promise<Array<{
  branchId: string
  branchName: string
  partnerId: string
  partnerName: string
  productId: string
  productName: string
  price: number
  available: number
  shareType: 'price_only' | 'full' // price_only = solo ven precio, full = pueden ver y reservar
}>> {
  // Obtener todos los partners que tienen habilitada la opción de compartir globalmente
  const { data: enabledPartners } = await supabase
    .from('partners')
    .select('id, name, slug, community_enabled')
    .eq('community_enabled', true)
    .eq('is_active', true)

  if (!enabledPartners || enabledPartners.length === 0) {
    return []
  }

  const enabledPartnerIds = enabledPartners.map(p => p.id)

  // Obtener todas las sucursales de esos partners
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name, partner_id')
    .in('partner_id', enabledPartnerIds)
    .eq('is_active', true)

  if (!branches || branches.length === 0) {
    return []
  }

  const branchIds = branches.map(b => b.id)
  const partnersMap = new Map(enabledPartners.map(p => [p.id, p]))
  const branchesMap = new Map(branches.map(b => [b.id, b]))

  // Obtener el stock de esas sucursales con info de producto y precio
  let query = supabase
    .from('branch_stock')
    .select(`
      available,
      product_id,
      branch_id,
      price_override,
      product:products!inner(id, name, price),
      branch:branches!inner(id, name, partner_id)
    `)
    .in('branch_id', branchIds)
    .gt('available', 0)

  if (productId) {
    query = query.eq('product_id', productId)
  }

  const { data: stock } = await query

  if (!stock) return []

  return stock.map((item: any) => {
    const product = item.product as any
    const branch = branchesMap.get(item.branch_id)
    const partner = branch ? partnersMap.get(branch.partner_id) : null

    return {
      branchId: item.branch_id,
      branchName: branch?.name || '',
      partnerId: partner?.id || '',
      partnerName: partner?.name || 'Socio',
      productId: item.product_id,
      productName: product?.name || '',
      price: item.price_override || product?.price || 0,
      available: Number(item.available),
      shareType: 'full',
    }
  })
}

/**
 * Verifica si un producto está disponible en una comunidad
 */
export async function isProductAvailableInCommunity(
  communityId: string,
  productId: string
): Promise<boolean> {
  const stock = await getCommunityStock(communityId, productId)
  return stock.length > 0
}

/**
 * Reserva stock de una comunidad para un socio
 */
export async function reserveFromCommunity(
  communityId: string,
  productId: string,
  quantity: number,
  requestingBranchId: string
): Promise<{ success: boolean; fromBranchId?: string; message?: string }> {
  // Obtener stock disponible en comunidad
  const availableStock = await getCommunityStock(communityId, productId)

  // Buscar primera sucursal con suficiente stock (que no sea la solicitante)
  const source = availableStock.find(
    s => s.branchId !== requestingBranchId && s.available >= quantity
  )

  if (!source) {
    return {
      success: false,
      message: 'No hay stock suficiente disponible en la comunidad',
    }
  }

  // Crear transferencia automática entre sucursales
  const transferData = {
    partnerId: source.partnerId,
    fromBranchId: source.branchId,
    toBranchId: requestingBranchId,
    items: [
      {
        productId,
        quantity,
      },
    ],
    notes: `Reserva desde comunidad (${communityId})`,
  }

  // Crear transferencia
  const transfer = await supabase
    .from('branch_transfers')
    .insert({
      partner_id: transferData.partnerId,
      from_branch_id: transferData.fromBranchId,
      to_branch_id: transferData.toBranchId,
      items: transferData.items,
      notes: transferData.notes,
      status: 'pending',
    })
    .select('transfer_number')
    .single()

  if (transfer.error) {
    return {
      success: false,
      message: 'Error al crear la transferencia de reserva',
    }
  }

  return {
    success: true,
    fromBranchId: source.branchId,
    message: `Transferencia ${transfer.data.transfer_number} creada. Contacta al gerente de la sucursal origen para aprobarla.`,
  }
}

// ============================================================================
// ESTADÍSTICAS DE COMUNIDAD
// ============================================================================

export async function getCommunityStats(communityId: string): Promise<{
  branchesCount: number
  partnersCount: number
  productsCount: number
  totalStock: number
}> {
  const shares = await getBranchShares(communityId)
  const branchIds = shares.map(s => s.branchId)

  // Contar productos únicos y stock total
  const { data: stockData } = await supabase
    .from('branch_stock')
    .select('product_id, available')
    .in('branch_id', branchIds)
    .gt('available', 0)

  const uniqueProducts = new Set(stockData?.map(s => s.product_id) || [])
  const totalStock = stockData?.reduce((sum, s) => sum + Number(s.available), 0) || 0

  // Obtener partners únicos
  const { data: branches } = await supabase
    .from('branches')
    .select('partner_id')
    .in('id', branchIds)

  const uniquePartners = new Set(branches?.map(b => b.partner_id) || [])

  return {
    branchesCount: shares.length,
    partnersCount: uniquePartners.size,
    productsCount: uniqueProducts.size,
    totalStock,
  }
}
