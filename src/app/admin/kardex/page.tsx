export const dynamic = "force-dynamic";

import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import { getProducts } from "@/lib/services/productService";
import { getRecentKardexEntries } from "@/lib/services/kardexService";
import KardexProductListClient from "@/components/admin/kardex/KardexProductListClient";

export default async function KardexProductsPage() {
  const [products, recentMovements] = await Promise.all([
    getProducts(),
    getRecentKardexEntries(10),
  ]);

  return (
    <AdminPageLayout title="Kardex">
      <KardexProductListClient products={products} recentMovements={recentMovements} />
    </AdminPageLayout>
  );
}
