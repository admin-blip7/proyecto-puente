"use server";

import { cookies } from "next/headers";

export type PosAccessScope = {
    userId?: string;
    name?: string;
    role?: string;
    partnerId?: string;
    branchId?: string;
    email?: string;
};
const SELECTED_BRANCH_COOKIE_PREFIX = "selected_branch_";

const decodeJwtPayload = (token: string): any | null => {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
        return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    } catch {
        return null;
    }
};

export const getPosAccessScope = async (): Promise<PosAccessScope | null> => {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tienda_admin_access_token")?.value;
        if (!token) return null;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            const payload = decodeJwtPayload(token);
            const metadata = payload?.user_metadata ?? {};
            const userId = payload?.sub || payload?.user_id;
            const selectedBranchId = userId
                ? cookieStore.get(`${SELECTED_BRANCH_COOKIE_PREFIX}${userId}`)?.value
                : null;
            return {
                userId,
                name: metadata?.name,
                role: metadata?.role,
                partnerId: metadata?.partner_id,
                branchId: selectedBranchId || metadata?.branch_id,
                email: payload?.email,
            };
        }

        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!userResponse.ok) {
            const payload = decodeJwtPayload(token);
            const metadata = payload?.user_metadata ?? {};
            const userId = payload?.sub || payload?.user_id;
            const selectedBranchId = userId
                ? cookieStore.get(`${SELECTED_BRANCH_COOKIE_PREFIX}${userId}`)?.value
                : null;
            return {
                userId,
                name: metadata?.name,
                role: metadata?.role,
                partnerId: metadata?.partner_id,
                branchId: selectedBranchId || metadata?.branch_id,
                email: payload?.email,
            };
        }

        const user = await userResponse.json();
        const metadata = user?.user_metadata ?? {};
        const selectedBranchId = user?.id
            ? cookieStore.get(`${SELECTED_BRANCH_COOKIE_PREFIX}${user.id}`)?.value
            : null;
        return {
            userId: user?.id,
            name: metadata?.name,
            role: metadata?.role,
            partnerId: metadata?.partner_id,
            branchId: selectedBranchId || metadata?.branch_id,
            email: user?.email,
        };
    } catch {
        return null;
    }
};
