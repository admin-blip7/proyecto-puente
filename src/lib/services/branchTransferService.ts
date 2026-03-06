import { supabase } from '@/lib/supabaseClient'
import { BranchTransfer, BranchTransferStatus, CreateTransferDTO, BranchTransferItem } from '@/types'

const TABLES = {
  transfers: 'branch_transfers',
  branches: 'branches',
  partners: 'partners',
} as const

// ============================================================================
// MAPEO DE DATOS
// ============================================================================

const mapBranchTransfer = (row: any): BranchTransfer => ({
  id: row?.id ?? '',
  transferNumber: row?.transfer_number ?? '',
  partnerId: row?.partner_id ?? '',
  fromBranchId: row?.from_branch_id,
  toBranchId: row?.to_branch_id ?? '',
  items: row?.items ?? [],
  status: row?.status ?? 'pending',
  requestedAt: new Date(row?.requested_at ?? Date.now()),
  approvedAt: row?.approved_at ? new Date(row.approved_at) : undefined,
  shippedAt: row?.shipped_at ? new Date(row.shipped_at) : undefined,
  receivedAt: row?.received_at ? new Date(row.received_at) : undefined,
  requestedBy: row?.requested_by,
  approvedBy: row?.approved_by,
  receivedBy: row?.received_by,
  notes: row?.notes,
  internalNotes: row?.internal_notes,
  createdAt: new Date(row?.created_at ?? Date.now()),
  updatedAt: new Date(row?.updated_at ?? Date.now()),
})

// ============================================================================
// TRANSFERENCIAS ENTRE SUCURSALES
// ============================================================================

export async function getTransfers(filters?: {
  partnerId?: string
  status?: BranchTransferStatus
  fromBranchId?: string
  toBranchId?: string
  limit?: number
  offset?: number
}): Promise<{ transfers: BranchTransfer[]; total: number }> {
  let query = supabase
    .from(TABLES.transfers)
    .select('*, partner:partners(*), from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)', {
      count: 'exact',
    })

  if (filters?.partnerId) {
    query = query.eq('partner_id', filters.partnerId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.fromBranchId) {
    query = query.eq('from_branch_id', filters.fromBranchId)
  }

  if (filters?.toBranchId) {
    query = query.eq('to_branch_id', filters.toBranchId)
  }

  query = query.order('requested_at', { ascending: false })

  if (filters?.limit) {
    const from = filters.offset || 0
    const to = from + filters.limit - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    transfers: (data || []).map(mapBranchTransfer),
    total: count || 0,
  }
}

/**
 * Obtiene las transferencias pendientes de un socio
 * Alias para getTransfers con status='pending'
 */
export async function getPendingTransfers(partnerId: string): Promise<{ transfers: BranchTransfer[]; total: number }> {
  return getTransfers({ partnerId, status: 'pending' })
}

export async function getTransferById(id: string): Promise<BranchTransfer | null> {
  const { data, error } = await supabase
    .from(TABLES.transfers)
    .select('*, partner:partners(*), from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return mapBranchTransfer(data)
}

export async function createTransfer(dto: CreateTransferDTO): Promise<BranchTransfer> {
  const payload: any = {
    partner_id: dto.partnerId,
    from_branch_id: dto.fromBranchId,
    to_branch_id: dto.toBranchId,
    items: dto.items,
    notes: dto.notes,
    status: 'pending',
    requested_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from(TABLES.transfers)
    .insert(payload)
    .select('*, partner:partners(*), from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)')
    .single()

  if (error) throw error

  return mapBranchTransfer(data)
}

export async function approveTransfer(
  transferId: string,
  approvedBy: string
): Promise<BranchTransfer> {
  const { data, error } = await supabase
    .from(TABLES.transfers)
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: approvedBy,
    })
    .eq('id', transferId)
    .select('*, partner:partners(*), from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)')
    .single()

  if (error) throw error

  return mapBranchTransfer(data)
}

export async function shipTransfer(transferId: string): Promise<BranchTransfer> {
  const { data, error } = await supabase
    .from(TABLES.transfers)
    .update({
      status: 'in_transit',
      shipped_at: new Date().toISOString(),
    })
    .eq('id', transferId)
    .select('*, partner:partners(*), from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)')
    .single()

  if (error) throw error

  return mapBranchTransfer(data)
}

export async function receiveTransfer(
  transferId: string,
  receivedBy: string,
  items?: BranchTransferItem[]
): Promise<BranchTransfer> {
  // Actualizar estado de la transferencia
  const updateData: any = {
    status: 'received',
    received_at: new Date().toISOString(),
    received_by: receivedBy,
  }

  if (items) {
    updateData.items = items
  }

  const { data: transfer, error: transferError } = await supabase
    .from(TABLES.transfers)
    .update(updateData)
    .eq('id', transferId)
    .select('*, from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)')
    .single()

  if (transferError) throw transferError

  // Actualizar stock en ambas sucursales
  // 1. Restar del origen
  if (transfer.from_branch) {
    for (const item of transfer.items) {
      await supabase.rpc('adjust_branch_stock', {
        p_branch_id: transfer.from_branch_id,
        p_product_id: item.productId,
        p_adjustment: -item.quantity,
      })
    }
  }

  // 2. Sumar al destino
  if (transfer.to_branch) {
    for (const item of transfer.items) {
      await supabase.rpc('adjust_branch_stock', {
        p_branch_id: transfer.to_branch_id,
        p_product_id: item.productId,
        p_adjustment: item.quantity,
      })
    }
  }

  // Retornar transferencia actualizada con datos completos
  return getTransferById(transferId) as Promise<BranchTransfer>
}

export async function cancelTransfer(
  transferId: string,
  notes?: string
): Promise<BranchTransfer> {
  const payload: any = {
    status: 'cancelled',
  }

  if (notes) {
    payload.internal_notes = notes
  }

  const { data, error } = await supabase
    .from(TABLES.transfers)
    .update(payload)
    .eq('id', transferId)
    .select('*, partner:partners(*), from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)')
    .single()

  if (error) throw error

  return mapBranchTransfer(data)
}

export async function getPendingIncomingTransfers(branchId: string): Promise<BranchTransfer[]> {
  const { data, error } = await supabase
    .from(TABLES.transfers)
    .select('*, partner:partners(*), from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)')
    .eq('to_branch_id', branchId)
    .in('status', ['pending', 'approved'])
    .order('requested_at', { ascending: false })

  if (error) throw error

  return (data || []).map(mapBranchTransfer)
}

export async function getPendingOutgoingTransfers(branchId: string): Promise<BranchTransfer[]> {
  const { data, error } = await supabase
    .from(TABLES.transfers)
    .select('*, partner:partners(*), from_branch:branches!branch_transfers_from_branch_id_fkey(*), to_branch:branches!branch_transfers_to_branch_id_fkey(*)')
    .eq('from_branch_id', branchId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  if (error) throw error

  return (data || []).map(mapBranchTransfer)
}
