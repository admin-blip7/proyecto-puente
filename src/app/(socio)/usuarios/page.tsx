import React from 'react';
import { UsersTable } from '@/components/admin/rbac/UsersTable';
import { CreateUserDialog } from '@/components/admin/rbac/CreateUserDialog';
import { getPartnerUsersWithPermissions } from '@/lib/services/rbacUserQueries';
import { updatePermissionsAction, toggleUserStatusAction, resetPasswordAction } from '@/app/admin/usuarios/actions';
import { createPartnerUserAction } from '@/app/(socio)/usuarios/actions';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import Link from 'next/link';
import { ArrowLeft, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function SocioUsersPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("tienda_admin_access_token")?.value;
    if (!token) return <div>No autenticado</div>;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: supabaseAnonKey!, Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    if (!userResp.ok) return <div>No autenticado</div>;
    const user = await userResp.json();

    const supabase = getSupabaseServerClient();
    const { data: profile } = await supabase
        .from('profiles')
        .select('partner_id, branch_id')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.partner_id) {
        return <div>Acceso denegado: No eres socio.</div>;
    }

    const partnerId = profile.partner_id;

    // Only fetch users belonging to this partner
    const users = await getPartnerUsersWithPermissions(partnerId);

    // Branches for this partner only
    const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .eq('partner_id', partnerId);

    const availableBranches = branches || [];

    // Bind partnerId into the create action
    const createUserBound = async (payload: any) => {
        "use server";
        return createPartnerUserAction(partnerId, profile.branch_id, payload);
    };

    return (
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-4">
                    <Link href="/pos">
                        <Button variant="ghost" size="sm" className="gap-2 w-fit -ml-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-4 h-4" />
                            Regresar al POS
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Gestión de mis Usuarios</h1>
                        <p className="text-muted-foreground text-sm sm:text-base">
                            Administra los roles, sucursales y permisos de los usuarios de tu empresa.
                        </p>
                    </div>
                </div>
                <CreateUserDialog
                    partnerId={partnerId}
                    branches={availableBranches}
                    onCreateUser={createUserBound}
                />
            </div>

            <UsersTable
                initialUsers={users}
                context="partner"
                availableBranches={availableBranches}
                onUpdatePermissions={updatePermissionsAction}
                onToggleStatus={toggleUserStatusAction}
                onResetPassword={resetPasswordAction}
            />
        </div>
    );
}
