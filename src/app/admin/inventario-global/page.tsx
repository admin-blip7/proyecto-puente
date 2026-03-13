export const dynamic = "force-dynamic";

import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import { getProducts } from "@/lib/services/productService";
import { getAllPartnerSummaries } from "@/lib/services/masterService";
import MasterDashboardClient from "@/components/admin/inventario-global/MasterDashboardClient";

export default async function InventarioGlobalPage() {
    const [summaries, allProducts] = await Promise.all([
        getAllPartnerSummaries(),
        getProducts(),
    ]);

    return (
        <AdminPageLayout title="Inventario Global">
            <MasterDashboardClient summaries={summaries} allProducts={allProducts} />
        </AdminPageLayout>
    );
}
