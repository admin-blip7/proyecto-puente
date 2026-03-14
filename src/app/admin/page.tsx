import InventoryClient from "@/components/admin/InventoryClient";
import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import { getProducts } from "@/lib/services/productService";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialProducts = await getProducts();

  return (
    <AdminPageLayout title="Inventario">
      <InventoryClient initialProducts={initialProducts} />
    </AdminPageLayout>
  );
}
