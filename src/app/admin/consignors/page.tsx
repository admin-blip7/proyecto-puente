export const dynamic = "force-dynamic";

import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import { getConsignors } from "@/lib/services/consignorService";
import ConsignorClient from "@/components/admin/consignors/ConsignorClient";

export default async function ConsignorsPage() {
    const initialConsignors = await getConsignors();

    return (
        <AdminPageLayout title="Consignaciones">
            <ConsignorClient initialConsignors={initialConsignors} />
        </AdminPageLayout>
    )
}
