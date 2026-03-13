import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import IntelligenceClient from "@/components/admin/intelligence/IntelligenceClient";
import { getProducts } from "@/lib/services/productService";
import { getSales } from "@/lib/services/salesService";

export default async function IntelligencePage() {
    const products = await getProducts();
    const sales = await getSales('completed', 0, 10000);

    return (
        <AdminPageLayout title="Inteligencia">
            <IntelligenceClient allProducts={products} allSales={sales.sales} />
        </AdminPageLayout>
    )
}
