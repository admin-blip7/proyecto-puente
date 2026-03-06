import React from 'react';
import { UsersTable } from '@/components/admin/rbac/UsersTable';
import { CreateUserDialog } from '@/components/admin/rbac/CreateUserDialog';
import { getAllUsersWithPermissions, getPartnerUsersWithPermissions } from '@/lib/services/rbacUserQueries';
import { updatePermissionsAction, toggleUserStatusAction, resetPasswordAction } from './actions';
import { createPartnerUserAction } from '@/app/(socio)/usuarios/actions';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function AdminUsersPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("tienda_admin_access_token")?.value;

    const supabase = getSupabaseServerClient();
    let isMasterAdmin = false;
    let partnerId: string | null = null;
    let availableBranches: { id: string; name: string }[] = [];

    if (token) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { apikey: supabaseAnonKey!, Authorization: `Bearer ${token}` },
            cache: "no-store",
        });
        if (userResp.ok) {
            const user = await userResp.json();
            isMasterAdmin = user?.email === 'admin@22electronicgroup.com';

            if (!isMasterAdmin) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('partner_id, branch_id')
                    .eq('id', user.id)
                    .single();
                partnerId = profile?.partner_id || null;

                if (partnerId) {
                    const { data: branches } = await supabase
                        .from('branches')
                        .select('id, name')
                        .eq('partner_id', partnerId);
                    availableBranches = branches || [];
                }
            }
        }
    }

    // Master Admin sees all, Socio sees only their partner's users
    const users = isMasterAdmin
        ? await getAllUsersWithPermissions()
        : partnerId
            ? await getPartnerUsersWithPermissions(partnerId)
            : [];

    const title = isMasterAdmin
        ? "Gestión Global de Usuarios y Permisos"
        : "Usuarios de mi Empresa";

    const subtitle = isMasterAdmin
        ? "Administra todos los usuarios del sistema, sus roles, sucursales y permisos de RBAC a nivel global."
        : "Administra los usuarios y permisos de tu empresa.";

    // Create user action bound to partner context
    const createUserBound = partnerId
        ? async (payload: any) => {
            "use server";
            return createPartnerUserAction(partnerId!, undefined, payload);
        }
        : null;

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
                        <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>
                        <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
                    </div>
                </div>
                {/* Only non-master admins (Socios) get the create button */}
                {!isMasterAdmin && partnerId && createUserBound && (
                    <CreateUserDialog
                        partnerId={partnerId}
                        branches={availableBranches}
                        onCreateUser={createUserBound}
                    />
                )}
            </div>

            <UsersTable
                initialUsers={users}
                context={isMasterAdmin ? "master" : "partner"}
                availableBranches={availableBranches}
                onUpdatePermissions={updatePermissionsAction}
                onToggleStatus={toggleUserStatusAction}
                onResetPassword={resetPasswordAction}
            />
        </div>
    );
}
