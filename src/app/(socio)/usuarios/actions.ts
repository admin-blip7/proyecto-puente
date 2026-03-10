"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { CreateUserPayload } from "@/components/admin/rbac/CreateUserDialog";

export async function createPartnerUserAction(
    partnerId: string,
    branchId: string | undefined,
    payload: CreateUserPayload
): Promise<{ error?: string }> {
    try {
        const supabase = getSupabaseServerClient();

        // 1. Create the Auth user via Supabase Admin SDK
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
            email: payload.email,
            password: payload.password,
            email_confirm: true,
            user_metadata: {
                name: payload.name,
                role: payload.role,
                partner_id: partnerId,
                branch_id: payload.branchId || branchId,
            },
        });

        if (authError) return { error: authError.message };
        if (!newUser?.user) return { error: "No se pudo crear el usuario." };

        const userId = newUser.user.id;

        // 2. Update the profile record (created by trigger) with role + partner
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                name: payload.name,
                role: payload.role,
                partner_id: partnerId,
                branch_id: payload.branchId || branchId || null,
            })
            .eq('id', userId);

        if (profileError) console.warn("Profile update error:", profileError.message);

        // 3. Save permissions in user_permissions table
        if (payload.permissions && payload.permissions.length > 0) {
            const { error: permError } = await supabase
                .from('user_permissions')
                .upsert({
                    user_id: userId,
                    custom_permissions: payload.permissions,
                    branch_id: payload.branchId || null,
                }, { onConflict: 'user_id' });

            if (permError) console.warn("Permissions error:", permError.message);
        }

        revalidatePath('/socio/usuarios');
        revalidatePath('/admin/usuarios');

        return {};
    } catch (err: any) {
        return { error: err?.message || "Error inesperado" };
    }
}
