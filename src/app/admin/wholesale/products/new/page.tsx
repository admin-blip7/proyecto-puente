import { redirect } from 'next/navigation'
import { getWholesaleSuppliers } from '@/lib/services/wholesaleService'
import { getProducts } from '@/lib/services/productService'
import { Header } from '@/components/shared/Header'
import LeftSidebar from '@/components/shared/LeftSidebar'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { WholesaleProductForm } from '@/components/admin/wholesale/WholesaleProductForm'

export default async function NewWholesaleProductPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>
}) {
  const [suppliers, allProducts, params] = await Promise.all([
    getWholesaleSuppliers(),
    getProducts(),
    searchParams,
  ])

  // Find the pre-selected product
  const preselectedProduct = params.productId
    ? allProducts.find((p) => p.id === params.productId)
    : undefined

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
              <Link href="/admin/wholesale/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Configurar Producto Dropshipping</h1>
              <p className="text-muted-foreground">
                Vincula un producto con un proveedor para venta bajo pedido
              </p>
            </div>
          </div>

          {/* Form */}
          <WholesaleProductForm
            suppliers={suppliers}
            products={allProducts}
            preselectedProduct={preselectedProduct}
          />
        </div>
      </main>
    </div>
  )
}
