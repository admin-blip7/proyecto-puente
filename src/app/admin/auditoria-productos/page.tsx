import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
import AuditClient from "@/components/admin/AuditClient";

export default function AuditoriaProductosPage() {
    return (
        <AdminPageLayout title="Auditoría">
            <AuditClient />
        </AdminPageLayout>
    );
}
