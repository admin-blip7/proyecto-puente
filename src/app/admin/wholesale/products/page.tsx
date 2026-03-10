import Link from "next/link"
import { getWholesaleProducts, getWholesaleSuppliers } from "@/lib/services/wholesaleService"
import { getProducts } from "@/lib/services/productService"
import { Header } from "@/components/shared/Header"
import LeftSidebar from "@/components/shared/LeftSidebar"
import { Button } from "@/components/ui/button"
import { Package, Plus, Edit, Trash2 } from "lucide-react"

export default async function WholesaleProductsPage() {
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Productos Dropshipping</h1>
              <p className="text-muted-foreground">
                Configura qué productos se venden bajo pedido
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/admin/wholesale">← Pedidos</Link>
              </Button>
              <Button asChild>
                <Link href="/admin/wholesale/products/bulk">
                  <Plus className="h-4 w-4 mr-2" />
                  Configurar en Masa
                </Link>
              </Button>
              <Button asChild>
                <Link href="/admin/wholesale/products/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Individual
                </Link>
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-1">¿Cómo funciona?</p>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Los productos dropshipping se muestran en la tienda online pero NO descuentan stock</li>
              <li>Solo se pueden comprar en cantidades mayores o iguales a la cantidad mínima configurada</li>
              <li>El proveedor envía directamente al cliente cuando haces el pedido</li>
            </ul>
          </div>

          {/* Configured Products */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Productos Configurados ({wholesaleProducts.length})</h2>

            {wholesaleProducts.length === 0 ? (
              <div className="bg-white rounded-lg border shadow-sm p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>No hay productos configurados para dropshipping</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Producto
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Proveedor
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        SKU Proveedor
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Cantidad Mínima
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Precio Mayoreo
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                        Costo Proveedor
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {wholesaleProducts.map((wp) => (
                      <tr key={wp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {wp.product?.imageUrls && wp.product.imageUrls[0] && (
                              <img
                                src={wp.product.imageUrls[0]}
                                alt={wp.product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <div className="font-medium">{wp.product?.name}</div>
                              <div className="text-xs text-muted-foreground">
                                SKU: {wp.product?.sku || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {wp.supplier?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono">
                          {wp.supplierSku || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {wp.wholesaleMinQty} unidades
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          ${wp.wholesalePrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          ${wp.supplierCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/wholesale/products/${wp.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Available Products */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Productos Disponibles ({availableProducts.length})</h2>

            {availableProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Todos los productos están configurados para dropshipping
              </p>
            ) : (
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableProducts.slice(0, 12).map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-4 hover:border-primary transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium line-clamp-1">{product.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku || 'Sin SKU'}
                          </p>
                          <p className="text-sm font-semibold mt-1">
                            ${product.price.toFixed(2)}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/wholesale/products/new?productId=${product.id}`}>
                            <Plus className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
