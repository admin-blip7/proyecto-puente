import { supabase } from '@/lib/supabaseClient'
import { getPosAccessScope } from './authScopeService'
import { ProductAuditLog, ProductAuditLogWithDetails, ProductAuditAction } from '@/types'

const TABLES = {
  auditLogs: 'product_audit_logs',
  products: 'products',
  profiles: 'profiles',
  partners: 'partners',
  branches: 'branches',
} as const

// ============================================================================
// MAPEO DE DATOS
// ============================================================================

const mapAuditLog = (row: any): ProductAuditLog => ({
  id: row?.id ?? '',
  productId: row?.product_id ?? '',
  action: row?.action as ProductAuditAction,
  userId: row?.user_id,
  userEmail: row?.user_email,
  userName: row?.user_name,
  partnerId: row?.partner_id,
  branchId: row?.branch_id,
  changes: row?.changes,
  reason: row?.reason,
  ipAddress: row?.ip_address,
  createdAt: new Date(row?.created_at ?? Date.now()),
})

const mapAuditLogWithDetails = (row: any): ProductAuditLogWithDetails => ({
  ...mapAuditLog(row),
  product: row?.product ? {
    id: row.product.id,
    name: row.product.name,
    sku: row.product.sku,
  } : undefined,
  user: row?.user ? {
    id: row.user.id,
    name: row.user.name || row.user.email?.split('@')[0] || '',
    email: row.user.email || '',
  } : undefined,
  partner: row?.partner,
  branch: row?.branch,
})

// ============================================================================
// LOGGING DE ACCIONES
// ============================================================================

/**
 * Registra manualmente una acción de auditoría para un producto
 * Nota: La mayoría de las acciones se registran automáticamente vía trigger,
 * pero esta función permite agregar entradas manuales con contexto adicional
 */
export async function logProductAction(params: {
  productId: string
  action: ProductAuditAction
  changes?: Record<string, { from: any; to: any }>
  reason?: string
  ipAddress?: string
}): Promise<ProductAuditLog | null> {
  try {
    const scope = await getPosAccessScope()

    const { data, error } = await supabase
      .from(TABLES.auditLogs)
      .insert({
        product_id: params.productId,
        action: params.action,
        user_id: scope?.userId,
        user_email: scope?.email,
        user_name: scope?.name,
        partner_id: scope?.partnerId,
        branch_id: scope?.branchId,
        changes: params.changes || {},
        reason: params.reason,
        ip_address: params.ipAddress,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error logging product action:', error)
      return null
    }

    return mapAuditLog(data)
  } catch (error) {
    console.error('Exception in logProductAction:', error)
    return null
  }
}

// ============================================================================
// CONSULTA DE HISTORIAL
// ============================================================================

/**
 * Obtiene el historial de auditoría completo de un producto
 */
export async function getProductAuditHistory(
  productId: string,
  options?: {
    limit?: number
    offset?: number
    actions?: ProductAuditAction[]
  }
): Promise<ProductAuditLogWithDetails[]> {
  let query = supabase
    .from(TABLES.auditLogs)
    .select(`
      *,
      product:products!inner(id, name, sku),
      user:profiles(id, name, email),
      partner:partners(id, name, slug),
      branch:branches(id, name, code)
    `)
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (options?.actions && options.actions.length > 0) {
    query = query.in('action', options.actions)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error getting product audit history:', error)
    return []
  }

  return (data || []).map(mapAuditLogWithDetails)
}

/**
 * Obtiene las últimas acciones de productos para un socio
 */
export async function getPartnerProductAuditLogs(
  partnerId: string,
  options?: {
    limit?: number
    offset?: number
    actions?: ProductAuditAction[]
    productId?: string
  }
): Promise<ProductAuditLogWithDetails[]> {
  let query = supabase
    .from(TABLES.auditLogs)
    .select(`
      *,
      product:products(id, name, sku),
      user:profiles(id, name, email),
      partner:partners(id, name, slug),
      branch:branches(id, name, code)
    `)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })

  if (options?.productId) {
    query = query.eq('product_id', options.productId)
  }

  if (options?.actions && options.actions.length > 0) {
    query = query.in('action', options.actions)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, (options.offset || 0) + (options.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error getting partner audit logs:', error)
    return []
  }

  return (data || []).map(mapAuditLogWithDetails)
}

/**
 * Obtiene el historial de cambios de precio de un producto
 */
export async function getProductPriceHistory(productId: string): Promise<ProductAuditLog[]> {
  const { data, error } = await supabase
    .from(TABLES.auditLogs)
    .select('*')
    .eq('product_id', productId)
    .eq('action', 'price_changed')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting price history:', error)
    return []
  }

  return (data || []).map(mapAuditLog)
}

/**
 * Obtiene el historial de cambios de costo de un producto
 */
export async function getProductCostHistory(productId: string): Promise<ProductAuditLog[]> {
  const { data, error } = await supabase
    .from(TABLES.auditLogs)
    .select('*')
    .eq('product_id', productId)
    .eq('action', 'cost_changed')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting cost history:', error)
    return []
  }

  return (data || []).map(mapAuditLog)
}

/**
 * Obtiene el historial de transferencias de ownership
 */
export async function getProductOwnershipTransfers(productId: string): Promise<ProductAuditLog[]> {
  const { data, error } = await supabase
    .from(TABLES.auditLogs)
    .select('*')
    .eq('product_id', productId)
    .eq('action', 'ownership_transferred')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting ownership transfers:', error)
    return []
  }

  return (data || []).map(mapAuditLog)
}

// ============================================================================
// ESTADÍSTICAS Y REPORTES
// ============================================================================

/**
 * Obtiene productos creados por un usuario específico
 */
export async function getProductsByCreator(
  creatorId: string,
  options?: {
    partnerId?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
  }
): Promise<Array<{ productId: string; productName: string; sku: string; createdAt: Date }>> {
  let query = supabase
    .from(TABLES.auditLogs)
    .select('product_id, product:products(id, name, sku), created_at')
    .eq('action', 'created')
    .eq('user_id', creatorId)
    .order('created_at', { ascending: false })

  if (options?.partnerId) {
    query = query.eq('partner_id', options.partnerId)
  }

  if (options?.dateFrom) {
    query = query.gte('created_at', options.dateFrom.toISOString())
  }

  if (options?.dateTo) {
    query = query.lte('created_at', options.dateTo.toISOString())
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error getting products by creator:', error)
    return []
  }

  return (data || []).map((row: any) => ({
    productId: row.product_id,
    productName: row.product?.name || '',
    sku: row.product?.sku || '',
    createdAt: new Date(row.created_at),
  }))
}

/**
 * Obtiene un resumen de actividad de productos para un periodo
 */
export async function getProductActivitySummary(
  options?: {
    partnerId?: string
    userId?: string
    dateFrom?: Date
    dateTo?: Date
  }
): Promise<{
  totalActions: number
  actionsByType: Record<ProductAuditAction, number>
  topUsers: Array<{ userId: string; userName: string; count: number }>
  recentProducts: Array<{ productId: string; productName: string; lastAction: string }>
}> {
  let query = supabase
    .from(TABLES.auditLogs)
    .select('*')
    .order('created_at', { ascending: false })

  if (options?.partnerId) {
    query = query.eq('partner_id', options.partnerId)
  }

  if (options?.userId) {
    query = query.eq('user_id', options.userId)
  }

  if (options?.dateFrom) {
    query = query.gte('created_at', options.dateFrom.toISOString())
  }

  if (options?.dateTo) {
    query = query.lte('created_at', options.dateTo.toISOString())
  }

  const { data, error } = await query.limit(1000)

  if (error) {
    console.error('Error getting activity summary:', error)
    return {
      totalActions: 0,
      actionsByType: {} as any,
      topUsers: [],
      recentProducts: [],
    }
  }

  const logs = (data || []).map(mapAuditLog)

  // Count by action type
  const actionsByType: any = {}
  for (const log of logs) {
    actionsByType[log.action] = (actionsByType[log.action] || 0) + 1
  }

  // Count by user
  const userCounts = new Map<string, { name: string; count: number }>()
  for (const log of logs) {
    if (log.userId) {
      const existing = userCounts.get(log.userId) || { name: log.userName || '', count: 0 }
      existing.count++
      userCounts.set(log.userId, existing)
    }
  }

  const topUsers = Array.from(userCounts.entries())
    .map(([userId, data]) => ({ userId, userName: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Get recent products
  const recentProducts = logs
    .slice(0, 20)
    .map((log) => ({
      productId: log.productId,
      productName: '', // Would need to join with products table
      lastAction: log.action,
    }))

  return {
    totalActions: logs.length,
    actionsByType,
    topUsers,
    recentProducts,
  }
}

/**
 * Exporta el historial de un producto a CSV
 */
export async function exportProductAuditToCSV(productId: string): Promise<string> {
  const logs = await getProductAuditHistory(productId, { limit: 1000 })

  if (logs.length === 0) {
    return 'No hay datos de auditoría para este producto'
  }

  const headers = ['Fecha', 'Acción', 'Usuario', 'Email', 'Socio', 'Sucursal', 'Cambios', 'Razón']
  const rows = logs.map((log) => [
    log.createdAt.toISOString(),
    log.action,
    log.userName || '',
    log.userEmail || '',
    log.partnerId || '',
    log.branchId || '',
    JSON.stringify(log.changes || {}),
    log.reason || '',
  ])

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')
}
