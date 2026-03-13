import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import SuppliersClient from "@/components/admin/suppliers/SuppliersClient";
import { getSuppliers } from "@/lib/services/supplierService";

export const metadata: Metadata = {
  title: "Proveedores - Admin",
  description: "Gestión de proveedores y historial de compras",
};

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <AdminPageLayout title="Proveedores">
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <SuppliersClient initialSuppliers={suppliers} />
      </Suspense>
    </AdminPageLayout>
  );
}
