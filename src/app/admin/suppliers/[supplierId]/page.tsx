import { notFound } from "next/navigation";
import { getSupplierById } from "@/lib/services/supplierService";
import SupplierDetailClient from "@/components/admin/suppliers/SupplierDetailClient";
import { getLogger } from "@/lib/logger";
const log = getLogger("SupplierPage");

interface SupplierDetailPageProps {
  params: {
    supplierId: string;
  };
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const { supplierId } = params;

  try {
    const supplier = await getSupplierById(supplierId);
    
    if (!supplier) {
      notFound();
    }

    return <SupplierDetailClient supplier={supplier} />;
  } catch (error) {
    log.error("Error loading supplier:", error);
    notFound();
  }
}