import { supabase } from '../supabaseClient';
import { Permission, Role, UserPermissions } from '@/types/rbac';

export const MASTER_ADMIN_EMAIL = 'admin@22electronicgroup.com';

const ALL_MODULES = [
    'pos', 'inventory', 'sales', 'finance', 'crm',
    'repairs', 'warranties', 'products', 'partners', 'users', 'settings'
];

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];

export const ALL_PERMISSIONS: Permission[] = ALL_MODULES.flatMap(module =>
    ALL_ACTIONS.map(action => ({
        module: module as any,
        action: action as any,
        scope: 'global'
    }))
);

export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase
        .from('user_permissions')
        .select('*, role:roles(*)')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
        id: data.id,
        userId: data.user_id,
        roleId: data.role_id,
        customPermissions: data.custom_permissions as Permission[],
        branchId: data.branch_id,
        inheritedPermissions: data.role?.permissions as Permission[] || [],
    };
}

export async function updateUserPermissions(userId: string, permissions: Permission[], roleId?: string, branchId?: string) {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data: existing } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('user_permissions')
            .update({
                custom_permissions: permissions,
                ...(roleId !== undefined && { role_id: roleId }),
                ...(branchId !== undefined && { branch_id: branchId }),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('user_permissions')
            .insert({
                user_id: userId,
                custom_permissions: permissions,
                role_id: roleId,
                branch_id: branchId
            });
        if (error) throw error;
    }
}

export async function resolveUserPermissions(user: { email: string; role: string; partnerId?: string; branchId?: string }, userId: string): Promise<Permission[]> {
    // 1. Master Admin check
    if (user.email === MASTER_ADMIN_EMAIL) {
        return ALL_PERMISSIONS;
    }

    // 2. Fetch specific or role permissions
    let basePermissions: Permission[] = [];
    const userPerms = await getUserPermissions(userId);

    if (userPerms && userPerms.customPermissions.length > 0) {
        basePermissions = userPerms.customPermissions;
    } else {
        // Get role permissions
        if (!supabase) throw new Error("Supabase is not initialized");
        const { data: role } = await supabase
            .from('roles')
            .select('permissions')
            .eq('name', user.role)
            .single();
        if (role && role.permissions) {
            basePermissions = role.permissions as Permission[];
        }
    }

    // 3. Socio Check
    if (user.role === 'Socio') {
        return basePermissions.map(p => ({
            ...p,
            scope: 'partner' as const,
            partnerId: user.partnerId
        }));
    }

    // 4. Normal users filtering
    return basePermissions.filter(p => {
        if (p.scope === 'global') return true;
        if (p.scope === 'partner' && p.partnerId === user.partnerId) return true;
        if (p.scope === 'branch' && p.branchIds?.includes(user.branchId || '')) return true;
        return false;
    });
}
