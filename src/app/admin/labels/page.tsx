import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import { getProducts } from "@/lib/services/productService";
import LabelPrinterClient from "@/components/admin/labels/LabelPrinterClient";
import { getLabelSettings } from "@/lib/services/settingsService";
import { getConsignors } from "@/lib/services/consignorService";
import { getSuppliers } from "@/lib/services/supplierService";

export const dynamic = "force-dynamic";

export default async function LabelsPage() {
    const [initialProducts, labelSettings, consignors, suppliers] = await Promise.all([
        getProducts(),
        getLabelSettings(),
        getConsignors(),
        getSuppliers(),
    ]);
   
    return (
        <AdminPageLayout title="Etiquetas">
            <LabelPrinterClient 
                allProducts={initialProducts} 
                settings={labelSettings} 
                consignors={consignors}
                suppliers={suppliers}
            />
        </AdminPageLayout>
    )
}
