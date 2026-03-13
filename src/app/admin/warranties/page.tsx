export const dynamic = "force-dynamic";

import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import { getWarranties } from "@/lib/services/warrantyService";
import WarrantyClient from "@/components/admin/warranties/WarrantyClient";

export default async function WarrantiesPage() {
    const initialWarranties = await getWarranties();
    
    return (
        <AdminPageLayout title="Garantías">
            <WarrantyClient initialWarranties={initialWarranties} />
        </AdminPageLayout>
    )
}
