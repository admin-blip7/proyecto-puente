export const dynamic = "force-dynamic";

import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import RepairDashboard from "@/components/admin/repairs/RepairDashboard";
import { getRepairOrders } from "@/lib/services/repairService";
import { getProducts } from "@/lib/services/productService";
import { getTicketSettings, getLabelSettings } from "@/lib/services/settingsService";

export default async function RepairsPage() {
    const [initialOrders, spareParts, ticketSettings, labelSettings] = await Promise.all([
        getRepairOrders(),
        getProducts(),
        getTicketSettings(),
        getLabelSettings("repair")
    ]);

    return (
        <AdminPageLayout title="Reparaciones">
            <RepairDashboard
                initialOrders={initialOrders}
                allSpareParts={spareParts.filter(p => p.type === 'Refacción')}
                ticketSettings={ticketSettings}
                labelSettings={labelSettings}
            />
        </AdminPageLayout>
    )
}
