import { supabase } from '@/lib/supabaseClient'
import { Partner, PartnerUser, PartnerStats, CreatePartnerDTO, UpdatePartnerDTO } from '@/types'
import { sendPartnerCredentialsEmail } from './emailService'

const TABLES = {
  partners: 'partners',
  branches: 'branches',
  users: 'users', // auth.users
} as const

// ============================================================================
// MAPEO DE DATOS
// ============================================================================

const mapPartner = (row: any): Partner => ({
  id: row?.id ?? '',
  name: row?.name ?? '',
  slug: row?.slug,
  contactName: row?.contact_name,
  email: row?.email,
  phone: row?.phone,
  address: row?.address,
  commissionRate: Number(row?.commission_rate ?? 0.15),
  paymentMethod: row?.payment_method,
  paymentData: row?.payment_data,
  communityEnabled: row?.community_enabled ?? false,
  allowBranchTransfers: row?.allow_branch_transfers ?? true,
  allowCrossBranchSelling: row?.allow_cross_branch_selling ?? true,
  maxMonthlySales: Number(row?.max_monthly_sales ?? 10000),
  creditLimit: Number(row?.credit_limit ?? 0),
  isActive: row?.is_active ?? true,
  settings: row?.settings,
  createdAt: new Date(row?.created_at ?? Date.now()),
  updatedAt: new Date(row?.updated_at ?? Date.now()),
})

// ============================================================================
// GESTIÓN DE SOCIOS
// ============================================================================

export async function getPartners(includeInactive = false): Promise<Partner[]> {
  const { data, error } = await supabase
    .from(TABLES.partners)
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error

  let partners = (data || []).map(mapPartner)

  if (!includeInactive) {
    partners = partners.filter(p => p.isActive)
  }

  return partners
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from(TABLES.partners)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return mapPartner(data)
}

export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const { data, error } = await supabase
    .from(TABLES.partners)
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return mapPartner(data)
}

export async function createPartner(dto: CreatePartnerDTO): Promise<Partner> {
  // Generar slug si no se proporciona
  const slug = dto.slug || dto.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const payload: any = {
    name: dto.name,
    slug,
    contact_name: dto.contactName,
    email: dto.email,
    phone: dto.phone,
    address: dto.address,
    commission_rate: dto.commissionRate ?? 0.15,
    payment_method: dto.paymentMethod ?? 'transfer',
    payment_data: dto.paymentData ?? {},
    community_enabled: dto.communityEnabled ?? false,
    allow_branch_transfers: dto.allowBranchTransfers ?? true,
    allow_cross_branch_selling: dto.allowCrossBranchSelling ?? true,
    max_monthly_sales: dto.maxMonthlySales ?? 10000,
    credit_limit: dto.creditLimit ?? 0,
    is_active: true,
  }

  const { data, error } = await supabase
    .from(TABLES.partners)
    .insert(payload)
    .select('*')
    .single()

  if (error) throw error

  return mapPartner(data)
}

export async function updatePartner(id: string, dto: UpdatePartnerDTO): Promise<Partner> {
  const payload: any = {}

  if (dto.name !== undefined) payload.name = dto.name
  if (dto.slug !== undefined) payload.slug = dto.slug
  if (dto.contactName !== undefined) payload.contact_name = dto.contactName
  if (dto.email !== undefined) payload.email = dto.email
  if (dto.phone !== undefined) payload.phone = dto.phone
  if (dto.address !== undefined) payload.address = dto.address
  if (dto.commissionRate !== undefined) payload.commission_rate = dto.commissionRate
  if (dto.paymentMethod !== undefined) payload.payment_method = dto.paymentMethod
  if (dto.paymentData !== undefined) payload.payment_data = dto.paymentData
  if (dto.communityEnabled !== undefined) payload.community_enabled = dto.communityEnabled
  if (dto.allowBranchTransfers !== undefined) payload.allow_branch_transfers = dto.allowBranchTransfers
  if (dto.allowCrossBranchSelling !== undefined) payload.allow_cross_branch_selling = dto.allowCrossBranchSelling
  if (dto.maxMonthlySales !== undefined) payload.max_monthly_sales = dto.maxMonthlySales
  if (dto.creditLimit !== undefined) payload.credit_limit = dto.creditLimit

  const { data, error } = await supabase
    .from(TABLES.partners)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return mapPartner(data)
}

export async function deactivatePartner(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.partners)
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function reactivatePartner(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.partners)
    .update({ is_active: true })
    .eq('id', id)

  if (error) throw error
}

export async function deletePartner(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.partners)
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// USUARIOS DE SOCIOS
// ============================================================================

export async function createPartnerUser(
  partnerId: string,
  userData: {
    email: string
    password: string
    name: string
    branchId?: string
  },
  options?: {
    partnerName?: string
    sendEmail?: boolean
  }
): Promise<{ userId: string; email: string; emailSent?: boolean }> {
  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: {
      data: {
        name: userData.name,
        role: 'Socio',
        partner_id: partnerId,
        branch_id: userData.branchId,
      },
    },
  })

  if (authError) throw authError

  if (!authData.user) {
    throw new Error('No se pudo crear el usuario')
  }

  // Enviar correo de bienvenida si se solicita
  let emailSent = false
  if (options?.sendEmail !== false && options?.partnerName) {
    try {
      // Enviar correo de bienvenida con enlace para configurar contraseña
      const emailResult = await sendPartnerCredentialsEmail({
        email: userData.email,
        partnerName: options.partnerName,
        userName: userData.name,
        type: 'welcome' // Indica que es un correo de bienvenida para nuevo usuario
      })
      emailSent = emailResult.success
      if (!emailSent) {
        console.warn('No se pudo enviar el correo de bienvenida:', emailResult.error)
      }
    } catch (error) {
      console.warn('Error al enviar correo de bienvenida:', error)
    }
  }

  return {
    userId: authData.user.id,
    email: authData.user.email!,
    emailSent,
  }
}

export async function getPartnerUsers(partnerId: string): Promise<PartnerUser[]> {
  // Obtener usuarios desde la tabla profiles filtrando por partner_id
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('partner_id', partnerId)

  if (error) {
    console.error('Error loading partner users:', error)
    return []
  }

  console.log(`[getPartnerUsers] Partner ID: ${partnerId}, Found: ${data?.length || 0} users`)

  return (data || []).map((row: any) => ({
    id: row.id,
    partnerId: row.partner_id || partnerId,
    email: row.email || '',
    name: row.name || row.email?.split('@')[0] || '',
    role: row.role || 'Socio',
    branchId: row.branch_id,
    isActive: true, // Por defecto activo si existe en profiles
    createdAt: new Date(row.created_at || Date.now()),
  }))
}

export async function updatePartnerUserBranch(
  userId: string,
  branchId: string | null
): Promise<void> {
  // Actualizar metadata del usuario
  const { error } = await supabase.auth.updateUser({
    data: {
      branch_id: branchId,
    },
  })

  if (error) throw error
}

// ============================================================================
// DASHBOARD MASTER - ESTADÍSTICAS
// ============================================================================

export async function getAllPartnersStats(): Promise<PartnerStats[]> {
  // Obtener todos los socios activos
  const partners = await getPartners(false)

  // Para cada socio, obtener sus estadísticas
  const stats: PartnerStats[] = await Promise.all(
    partners.map(async (partner) => {
      // Contar sucursales
      const { count: branchesCount } = await supabase
        .from(TABLES.branches)
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partner.id)
        .eq('is_active', true)

      // Obtener resumen de ventas (si existe tabla de ventas con partner_id)
      // Por ahora, retornar datos base
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        totalSales: 0,
        salesCount: 0,
        totalProducts: 0,
        totalStock: 0,
        branchesCount: branchesCount || 0,
        communityEnabled: partner.communityEnabled,
        sharedProductsCount: 0,
        commissionRate: partner.commissionRate,
        commissionTotal: 0,
      }
    })
  )

  return stats
}

export async function getPartnerDetailStats(partnerId: string): Promise<PartnerStats> {
  const partner = await getPartnerById(partnerId)
  if (!partner) throw new Error('Socio no encontrado')

  // Contar sucursales
  const { count: branchesCount } = await supabase
    .from(TABLES.branches)
    .select('*', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .eq('is_active', true)

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    totalSales: 0,
    salesCount: 0,
    totalProducts: 0,
    totalStock: 0,
    branchesCount: branchesCount || 0,
    communityEnabled: partner.communityEnabled,
    sharedProductsCount: 0,
    commissionRate: partner.commissionRate,
    commissionTotal: 0,
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

export async function isPartnerEmailAvailable(email: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from(TABLES.partners)
    .select('id')
    .eq('email', email)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error

  return (data?.length ?? 0) === 0
}
