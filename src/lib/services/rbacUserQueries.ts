"use server";

import { supabase } from '@/lib/supabaseClient';

export async function getAllUsersWithPermissions() {
    if (!supabase) throw new Error("Supabase client not initialized.");

    // Fetch profiles directly without embedded joins (no FK registered in PostgREST)
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, partner_id, branch_id')
        .order('created_at', { ascending: false });

    if (error) throw error;

    if (!profiles || profiles.length === 0) return [];

    // Collect unique partner_ids and branch_ids
    const partnerIds = [...new Set(profiles.map(p => p.partner_id).filter(Boolean))];
    const branchIds = [...new Set(profiles.map(p => p.branch_id).filter(Boolean))];

    // Batch fetch partners and branches
    const [{ data: partners }, { data: branches }] = await Promise.all([
        partnerIds.length > 0
            ? supabase.from('partners').select('id, name').in('id', partnerIds)
            : Promise.resolve({ data: [] as any[] }),
        branchIds.length > 0
            ? supabase.from('branches').select('id, name').in('id', branchIds)
            : Promise.resolve({ data: [] as any[] }),
    ]);

    const partnerMap = Object.fromEntries((partners || []).map(p => [p.id, p.name]));
    const branchMap = Object.fromEntries((branches || []).map(b => [b.id, b.name]));

    return profiles.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        partnerId: p.partner_id,
        partnerName: p.partner_id ? (partnerMap[p.partner_id] || '') : '',
        branchName: p.branch_id ? (branchMap[p.branch_id] || '') : '',
        isActive: true, // is_active not available on profiles table
    }));
}

export async function getPartnerUsersWithPermissions(partnerId: string) {
    if (!supabase) throw new Error("Supabase client not initialized.");

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, partner_id, branch_id')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false });

    if (error) throw error;

    if (!profiles || profiles.length === 0) return [];

    const branchIds = [...new Set(profiles.map(p => p.branch_id).filter(Boolean))];

    const { data: branches } = branchIds.length > 0
        ? await supabase.from('branches').select('id, name').in('id', branchIds)
        : { data: [] as any[] };

    const branchMap = Object.fromEntries((branches || []).map(b => [b.id, b.name]));

    return profiles.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        partnerId: p.partner_id,
        partnerName: '',
        branchName: p.branch_id ? (branchMap[p.branch_id] || '') : '',
        isActive: true, // is_active not available on profiles table
    }));
}
