import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import StockEntryClient from "@/components/admin/stock-entry/StockEntryClient";
import { getProducts } from "@/lib/services/productService";
import { getLabelSettings } from "@/lib/services/settingsService";

export default async function StockEntryPage() {
    const labelSettings = await getLabelSettings();
    const allProducts = await getProducts();

    return (
        <AdminPageLayout title="Entrada Stock">
            <StockEntryClient allProducts={allProducts} labelSettings={labelSettings} />
        </AdminPageLayout>
    )
}
