'use server';

import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";
import { Product } from "@/types";
import { sanitizeBranchTimeZone } from "@/lib/branchTimeZone";

const log = getLogger("masterService");

export interface SocioInfo {
    id: string;
    email: string;
    name: string;
    partnerId: string | null;
    branchId: string | null;
    role: string;
    createdAt: string;
}

export interface BranchInfo {
    id: string;
    name: string;
    partnerId: string;
    isMain: boolean;
    isActive: boolean;
}

export interface BranchInventory {
    branch: BranchInfo;
    products: Product[];
    totalUnits: number;
    totalValueCost: number;
    totalValuePrice: number;
}

export interface PartnerSummary {
    socio: SocioInfo;
    branches: BranchInfo[];
    branchInventory: BranchInventory[];
    sales: {
        count: number;
        totalRevenue: number;
        last30DaysRevenue: number;
        recentSales: Array<{
            id: string;
            saleId: string;
            total: number;
            cashierName: string;
            customerName: string | null;
            createdAt: string;
            status: string;
        }>;
    };
    clients: {
        count: number;
        list: Array<{ id: number; name: string; email: string | null; phone: string | null; totalPurchases: number }>;
    };
    cashSessions: {
        count: number;
        totalCashSales: number;
        totalCardSales: number;
    };
    userIds: string[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

const mapProductRow = (r: any, idx: number): Product => ({
    id: r.id ?? `temp-${idx}`,
    name: r.name ?? "",
    sku: r.sku ?? "",
    price: Number(r.price ?? 0),
    cost: Number(r.cost ?? 0),
    stock: Number(r.stock ?? 0),
    createdAt: new Date(r.created_at),
    type: r.type ?? "Venta",
    ownershipType: r.ownership_type ?? "Propio",
    consignorId: r.consignor_id ?? undefined,
    reorderPoint: r.reorder_point !== null ? Number(r.reorder_point) : undefined,
    comboProductIds: Array.isArray(r.combo_product_ids) ? r.combo_product_ids : [],
    compatibilityTags: Array.isArray(r.compatibility_tags) ? r.compatibility_tags : [],
    searchKeywords: Array.isArray(r.search_keywords) ? r.search_keywords : [],
    category: r.category ?? undefined,
    attributes: r.attributes ?? {},
    imageUrls: Array.isArray(r.image_urls) ? r.image_urls : [],
    branchId: r.branch_id ?? undefined,
    partnerId: r.partner_id ?? undefined,
});

// ── public functions ──────────────────────────────────────────────────────────

export const getAllSocios = async (): Promise<SocioInfo[]> => {
    try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        return (data.users ?? [])
            .filter((u) => String(u.user_metadata?.role || u.app_metadata?.role || "").toLowerCase() === "socio")
            .map((u) => ({
                id: u.id,
                email: u.email ?? "",
                name: (u.user_metadata?.name as string) || (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "Sin nombre",
                partnerId: (u.user_metadata?.partner_id as string) || null,
                branchId: (u.user_metadata?.branch_id as string) || null,
                role: "Socio",
                createdAt: u.created_at,
            }));
    } catch (error) {
        log.error("Error fetching socios", error);
        return [];
    }
};

export const getAllBranches = async (): Promise<BranchInfo[]> => {
    try {
        const supabase = getSupabaseServerClient();
        const { data, error } = await supabase
            .from("branches")
            .select("id, name, partner_id, is_main, is_active")
            .order("partner_id", { ascending: true })
            .order("is_main", { ascending: false });
        if (error) throw error;

        return (data ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            partnerId: row.partner_id,
            isMain: row.is_main ?? false,
            isActive: row.is_active ?? true,
        }));
    } catch (error) {
        log.error("Error fetching branches", error);
        return [];
    }
};

export interface BranchNotificacion {
    id: string;
    name: string;
    notification_email: string | null;
    timezone: string;
}

export const getBranchesWithNotificaciones = async (): Promise<BranchNotificacion[]> => {
    try {
        const supabase = getSupabaseServerClient();
        let { data, error } = await supabase
            .from("branches")
            .select("id, name, notification_email, timezone")
            .order("name");

        if (error && /timezone/i.test(error.message || "")) {
            const fallback = await supabase
                .from("branches")
                .select("id, name, notification_email")
                .order("name");

            data = fallback.data;
            error = fallback.error;
        }

        if (error) throw error;
        return (data ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            notification_email: row.notification_email ?? null,
            timezone: sanitizeBranchTimeZone(row.timezone),
        }));
    } catch (error) {
        log.error("Error fetching branches with notificaciones", error);
        return [];
    }
};

export const getInventoryByBranch = async (branches: BranchInfo[]): Promise<BranchInventory[]> => {
    if (branches.length === 0) return [];
    try {
        const supabase = getSupabaseServerClient();
        const branchIds = branches.map((b) => b.id);
        const { data, error } = await supabase
            .from("products")
            .select("*")
            .in("branch_id", branchIds)
            .order("name", { ascending: true });
        if (error) throw error;

        const rows = data ?? [];
        return branches.map((branch) => {
            const prods: Product[] = rows
                .filter((r: any) => r.branch_id === branch.id)
                .map(mapProductRow);
            return {
                branch,
                products: prods,
                totalUnits: prods.reduce((a, p) => a + p.stock, 0),
                totalValueCost: prods.reduce((a, p) => a + p.cost * p.stock, 0),
                totalValuePrice: prods.reduce((a, p) => a + p.price * p.stock, 0),
            };
        });
    } catch (error) {
        log.error("Error fetching inventory by branch", error);
        return branches.map((branch) => ({ branch, products: [], totalUnits: 0, totalValueCost: 0, totalValuePrice: 0 }));
    }
};

/** Main function: returns full summary per partner */
export const getAllPartnerSummaries = async (): Promise<PartnerSummary[]> => {
    const supabase = getSupabaseServerClient();

    const [socios, branches] = await Promise.all([getAllSocios(), getAllBranches()]);
    if (socios.length === 0) return [];

    const partnerIds = [...new Set(socios.map((s) => s.partnerId).filter(Boolean))] as string[];

    // ── 1. Profiles → map userId → partnerId ────────────────────────────────
    const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, partner_id, branch_id")
        .in("partner_id", partnerIds);

    const profiles = (profilesData ?? []) as Array<{ id: string; partner_id: string; branch_id: string | null }>;
    const userIdsByPartner: Record<string, string[]> = {};
    for (const p of profiles) {
        if (!p.partner_id) continue;
        if (!userIdsByPartner[p.partner_id]) userIdsByPartner[p.partner_id] = [];
        userIdsByPartner[p.partner_id].push(p.id);
    }
    // Also include the socio user themselves
    for (const s of socios) {
        if (!s.partnerId) continue;
        if (!userIdsByPartner[s.partnerId]) userIdsByPartner[s.partnerId] = [];
        if (!userIdsByPartner[s.partnerId].includes(s.id)) {
            userIdsByPartner[s.partnerId].push(s.id);
        }
    }

    const allUserIds = [...new Set(Object.values(userIdsByPartner).flat())];

    // ── 2. Sales ─────────────────────────────────────────────────────────────
    const { data: salesData } = await supabase
        .from("sales")
        .select("id, cashier_id, cashier_name, customer_name, total_amount, created_at, status, sale_id")
        .in("cashier_id", allUserIds)
        .or("status.is.null,status.eq.completed")
        .order("created_at", { ascending: false });

    const salesRows = (salesData ?? []) as Array<{
        id: string; cashier_id: string; cashier_name: string | null;
        customer_name: string | null; total_amount: number; created_at: string;
        status: string | null; sale_id: string;
    }>;

    // ── 3. Clients ───────────────────────────────────────────────────────────
    const { data: clientsData } = await supabase
        .from("crm_clients")
        .select("id, first_name, last_name, email, phone, total_purchases, created_by")
        .in("created_by", allUserIds);

    const clientRows = (clientsData ?? []) as Array<{
        id: number; first_name: string; last_name: string; email: string | null;
        phone: string | null; total_purchases: number; created_by: string;
    }>;

    // ── 4. Cash sessions ─────────────────────────────────────────────────────
    const { data: sessionsData } = await supabase
        .from("cash_sessions")
        .select("id, opened_by, total_cash_sales, total_card_sales, status")
        .in("opened_by", allUserIds);

    const sessionRows = (sessionsData ?? []) as Array<{
        id: string; opened_by: string; total_cash_sales: number; total_card_sales: number; status: string;
    }>;

    // ── 5. Inventory per branch ───────────────────────────────────────────────
    const branchInventory = await getInventoryByBranch(branches);

    // ── 6. Assemble per socio ─────────────────────────────────────────────────
    const now = Date.now();
    const ms30d = 30 * 24 * 60 * 60 * 1000;

    return socios.map((socio) => {
        const pid = socio.partnerId ?? "";
        const userIds = userIdsByPartner[pid] ?? [];
        const socioBranches = branches.filter((b) => b.partnerId === pid);

        const socioSales = salesRows.filter((s) => userIds.includes(s.cashier_id));
        const totalRevenue = socioSales.reduce((a, s) => a + Number(s.total_amount ?? 0), 0);
        const last30DaysRevenue = socioSales
            .filter((s) => now - new Date(s.created_at).getTime() < ms30d)
            .reduce((a, s) => a + Number(s.total_amount ?? 0), 0);

        const socioClients = clientRows.filter((c) => userIds.includes(c.created_by));
        const socioSessions = sessionRows.filter((s) => userIds.includes(s.opened_by));

        const socioBranchInventory = branchInventory.filter((inv) => inv.branch.partnerId === pid);

        return {
            socio,
            branches: socioBranches,
            branchInventory: socioBranchInventory,
            sales: {
                count: socioSales.length,
                totalRevenue,
                last30DaysRevenue,
                recentSales: socioSales.slice(0, 10).map((s) => ({
                    id: s.id,
                    saleId: s.sale_id,
                    total: Number(s.total_amount ?? 0),
                    cashierName: s.cashier_name ?? "—",
                    customerName: s.customer_name,
                    createdAt: s.created_at,
                    status: s.status ?? "completed",
                })),
            },
            clients: {
                count: socioClients.length,
                list: socioClients.slice(0, 20).map((c) => ({
                    id: c.id,
                    name: `${c.first_name} ${c.last_name}`,
                    email: c.email,
                    phone: c.phone,
                    totalPurchases: Number(c.total_purchases ?? 0),
                })),
            },
            cashSessions: {
                count: socioSessions.length,
                totalCashSales: socioSessions.reduce((a, s) => a + Number(s.total_cash_sales ?? 0), 0),
                totalCardSales: socioSessions.reduce((a, s) => a + Number(s.total_card_sales ?? 0), 0),
            },
            userIds,
        };
    });
};
