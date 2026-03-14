import { NextResponse } from 'next/server';
import { createProductFromDiagnostic } from '@/lib/services/productService';
import { requireDiagnosticsAdminUser } from "@/lib/diagnostics/bridge";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { cookies } from "next/headers";
import { z } from 'zod';

const CreateSeminuevoSchema = z.object({
    diagnosticId: z.string().min(1),
    price: z.coerce.number().min(0),
    cost: z.coerce.number().min(0),
    ownershipType: z.enum(['Propio', 'Consigna']),
    consignorId: z.string().optional(),
    notes: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const user = await requireDiagnosticsAdminUser();
        const body = await req.json();
        const data = CreateSeminuevoSchema.parse(body);
        const cookieStore = await cookies();

        const supabase = getSupabaseServerClient();
        const rawRole =
            (user as any)?.user_metadata?.role ??
            (user as any)?.app_metadata?.role ??
            ((user as any)?.app_metadata?.isAdmin === true ? "Admin" : "Admin");
        const roleLabel = String(rawRole ?? "Admin").trim() || "Admin";
        const selectedBranchCookie = cookieStore.get(`selected_branch_${user.id}`)?.value?.trim() || null;

        const [{ data: profile }, { data: branch }] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, name, branch_id")
                .eq("id", user.id)
                .maybeSingle(),
            supabase
                .from("branches")
                .select("id, name")
                .eq("id", String(selectedBranchCookie ?? (user as any)?.user_metadata?.branch_id ?? ""))
                .maybeSingle(),
        ]);

        const profileBranchId = (selectedBranchCookie ?? (profile as any)?.branch_id) as string | undefined;
        let branchName: string | undefined = (branch as any)?.name as string | undefined;
        if (!branchName && profileBranchId) {
            const { data: branchFromProfile } = await supabase
                .from("branches")
                .select("id, name")
                .eq("id", profileBranchId)
                .maybeSingle();
            branchName = (branchFromProfile as any)?.name as string | undefined;
        }
        const branchRoleLabel = `${branchName ?? "Global / Matriz"} • ${roleLabel}`;

        const newProduct = await createProductFromDiagnostic({
            ...data,
            inventoryContext: {
                createdByUserId: user.id,
                createdByName:
                    String((profile as any)?.name ?? (user as any)?.user_metadata?.name ?? user.email ?? "").trim() || undefined,
                branchId: profileBranchId ?? (user as any)?.user_metadata?.branch_id ?? undefined,
                branchName: branchRoleLabel,
            },
        });

        return NextResponse.json({ success: true, product: newProduct });
    } catch (error) {
        console.error('Error in POST /api/seminuevo/create:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
        }
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Error desconocido al crear seminuevo' },
            { status: 500 }
        );
    }
}
