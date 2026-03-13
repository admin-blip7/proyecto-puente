import Link from "next/link"
import { AdminPageLayout } from "@/components/shared/AdminPageLayout"
import { getWholesaleOrders } from "@/lib/services/wholesaleService"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Users, Package } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default async function WholesalePage() {
  const { orders } = await getWholesaleOrders({
    limit: 50,
  })

  const statusLabels = {
    pending: 'Pendiente',
    sent_to_supplier: 'Enviado a Proveedor',
    confirmed: 'Confirmado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    sent_to_supplier: 'bg-blue-100 text-blue-800 border-blue-200',
    confirmed: 'bg-green-100 text-green-800 border-green-200',
    shipped: 'bg-purple-100 text-purple-800 border-purple-200',
    delivered: 'bg-gray-100 text-gray-800 border-gray-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  }

  const stats = {
    pending: orders.filter((o) => o.status === 'pending').length,
    active: orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length,
    totalProfit: orders.reduce((sum, o) => sum + (o.profit || 0), 0),
  }

  return (
    <AdminPageLayout title="Pedidos Dropshipping">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pedidos Dropshipping</h1>
            <p className="text-muted-foreground">
              Gestión de pedidos mayoreo enviados a proveedores
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/wholesale/suppliers">
                <Users className="h-4 w-4 mr-2" />
                Proveedores
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/wholesale/products">
                <Package className="h-4 w-4 mr-2" />
                Productos
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ganancia Total</p>
                <p className="text-2xl font-bold">${stats.totalProfit.toFixed(2)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Orden</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Proveedor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Items</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ganancia</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <ShoppingBag className="h-12 w-12 text-gray-300" />
                        <p>No hay pedidos dropshipping</p>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/admin/wholesale/products">Configurar Productos</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm">{order.orderNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          {order.customerPhone && (
                            <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{order.supplier?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{order.items.length} producto(s)</td>
                      <td className="px-4 py-3 text-sm font-medium">${order.subtotal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">${(order.profit || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium border ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(order.orderDate), { addSuffix: true, locale: es })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/wholesale/orders/${order.id}`}>Ver</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  )
}
