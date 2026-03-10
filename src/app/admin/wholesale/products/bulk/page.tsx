import Link from "next/link"
import { getWholesaleProducts, getWholesaleSuppliers } from "@/lib/services/wholesaleService"
import { getProducts } from "@/lib/services/productService"
import LeftSidebar from "@/components/shared/LeftSidebar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check } from "lucide-react"
import { BulkWholesaleForm } from "@/components/admin/wholesale/BulkWholesaleForm"

export default async function BulkWholesaleProductsPage() {
  const [wholesaleProducts, allProducts, suppliers] = await Promise.all([
    getWholesaleProducts(),
    getProducts(),
    getWholesaleSuppliers(),
  ])

  // Productos que ya tienen dropshipping configurado
  const configuredProductIds = new Set(wholesaleProducts.map((wp) => wp.productId))
  const availableProducts = allProducts.filter((p) => !configuredProductIds.has(p.id))

  return (
    <div className="flex h-screen w-full flex-row">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/wholesale/products">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Configuración en Masa</h1>
              <p className="text-muted-foreground">
                Selecciona múltiples productos y configúralos con un porcentaje de ganancia fijo
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-1">Configuración rápida</p>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Selecciona los productos que quieres agregar</li>
              <li>Define un porcentaje de ganancia (ej: 30% sobre el costo)</li>
              <li>El precio mayoreo se calculará automáticamente: costo + (costo × porcentaje)</li>
              <li>Todos usarán el mismo proveedor y cantidad mínima</li>
            </ul>
          </div>

          {/* Form */}
          <BulkWholesaleForm
            availableProducts={availableProducts}
            suppliers={suppliers}
          />
        </div>
      </main>
    </div>
  )
}
