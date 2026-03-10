"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { Permission } from "@/types/rbac";
import { updateUserPermissions } from "@/lib/services/rbacService";

export async function updatePermissionsAction(userId: string, permissions: Permission[]): Promise<void> {
    const cookieStore = await cookies();
    const token = cookieStore.get("tienda_admin_access_token")?.value;
    if (!token) throw new Error("No autenticado");

    // TODO: Verify if the currennt user is Master Admin or Socio with access to this user

    await updateUserPermissions(userId, permissions);

    revalidatePath('/admin/usuarios');
    revalidatePath('/socio/usuarios');
}

export async function toggleUserStatusAction(userId: string): Promise<void> {
    // Not implemented fully yet
    console.log('Toggling user status for', userId);
}

export async function resetPasswordAction(userId: string): Promise<void> {
    // Not implemented fully yet
    console.log('Resetting password for', userId);
}
