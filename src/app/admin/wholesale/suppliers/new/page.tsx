import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import LeftSidebar from '@/components/shared/LeftSidebar'
import { SupplierForm } from '@/components/admin/wholesale/SupplierForm'

export default function NewSupplierPage() {
  return (
    <div className="flex h-screen w-full flex-row">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/wholesale/suppliers">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Nuevo Proveedor</h1>
              <p className="text-muted-foreground">
                Agrega un nuevo proveedor de dropshipping
              </p>
            </div>
          </div>

          {/* Form */}
          <SupplierForm />
        </div>
      </main>
    </div>
  )
}
