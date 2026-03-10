import { notFound } from "next/navigation"
import { getWholesaleOrderById } from "@/lib/services/wholesaleService"
import { sendOrderToSupplier, updateWholesaleOrderStatus } from "@/lib/services/wholesaleService"
import { Header } from "@/components/shared/Header"
import LeftSidebar from "@/components/shared/LeftSidebar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MessageCircle, Check, X, Truck, Package, Edit } from "lucide-react"
import { revalidatePath } from "next/cache"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export default async function WholesaleOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const order = await getWholesaleOrderById(orderId)

  if (!order) {
    notFound()
  }

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

  const items = order.items as any[]

  return (
    <div className="flex h-screen w-full flex-row">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <a href="/admin/wholesale">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Orden {order.orderNumber}</h1>
              <p className="text-muted-foreground">
                Pedido dropshipping a proveedor
              </p>
            </div>
          </div>

          {/* Status Banner */}
          <div className={`border rounded-lg p-4 ${statusColors[order.status]}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estado actual</p>
                <p className="text-lg font-bold">{statusLabels[order.status]}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Fecha de pedido</p>
                <p className="font-medium">
                  {new Date(order.orderDate).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Acciones según estado */}
          <OrderActions orderId={order.id} status={order.status} supplier={order.supplier} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información del Cliente */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Cliente
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
                {order.customerPhone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="text-primary hover:underline"
                      >
                        {order.customerPhone}
                      </a>
                    </p>
                  </div>
                )}
                {order.customerEmail && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{order.customerEmail}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Dirección de Envío</p>
                  <div className="text-sm bg-gray-50 p-3 rounded mt-1">
                    {(order.shippingAddress as any).address}
                    <br />
                    {(order.shippingAddress as any).city}, {(order.shippingAddress as any).state}
                    <br />
                    CP: {(order.shippingAddress as any).zipCode}
                  </div>
                </div>
              </div>
            </div>

            {/* Información del Proveedor */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Información del Proveedor
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{order.supplier?.name || '-'}</p>
                </div>
                {order.supplierOrderNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Orden del Proveedor</p>
                    <p className="font-mono text-sm">{order.supplierOrderNumber}</p>
                  </div>
                )}
                {order.trackingNumber && (
                  <div>
                    <p className="text-sm text-muted-foreground">Número de Rastreo</p>
                    <p className="font-mono text-sm">
                      <a
                        href={order.trackingUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {order.trackingNumber}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items del Pedido */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Productos</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                      Producto
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">
                      SKU
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                      Cantidad
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                      Precio Venta
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">
                      Costo Proveedor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm">{item.name}</td>
                      <td className="px-4 py-2 text-sm font-mono">
                        {item.supplierSku || item.sku}
                      </td>
                      <td className="px-4 py-2 text-right text-sm">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-sm">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                        ${item.supplierCost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen Financiero */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Resumen Financiero</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-xl font-bold">${order.subtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Costo Proveedor</p>
                <p className="text-xl font-bold">${order.supplierCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tu Ganancia</p>
                <p className="text-xl font-bold text-green-600">
                  ${order.profit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Notas */}
          {(order.notes || order.internalNotes) && (
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Notas</h2>
              {order.notes && (
                <div className="mb-2">
                  <p className="text-sm text-muted-foreground mb-1">Notas del Cliente:</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
              {order.internalNotes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notas Internas:</p>
                  <p className="text-sm">{order.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Componente de acciones (server actions)
function OrderActions({
  orderId,
  status,
  supplier,
}: {
  orderId: string
  status: string
  supplier: any
}) {
  async function sendToSupplier() {
    'use server'
    await sendOrderToSupplier(orderId, 'whatsapp')
    revalidatePath('/admin/wholesale')
  }

  async function updateStatus(newStatus: any) {
    'use server'
    await updateWholesaleOrderStatus(orderId, newStatus)
    revalidatePath('/admin/wholesale')
  }

  // Botones según estado
  if (status === 'pending') {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Acciones Disponibles</h2>
        <div className="flex flex-wrap gap-3">
          <form action={sendToSupplier}>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </form>
          <Button
            variant="destructive"
            onClick={() => updateStatus({ status: 'cancelled' })}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar Pedido
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'sent_to_supplier') {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Acciones Disponibles</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => updateStatus({ status: 'confirmed' })}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Confirmar Pedido
          </Button>
          <Button
            variant="destructive"
            onClick={() => updateStatus({ status: 'cancelled' })}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Acciones Disponibles</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => updateStatus({
              status: 'shipped',
              trackingNumber: 'PENDIENTE', // Se puede editar después
            })}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Truck className="h-4 w-4 mr-2" />
            Marcar como Enviado
          </Button>
          <Button
            variant="outline"
            onClick={() => updateStatus({ status: 'cancelled' })}
          >
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'shipped') {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Acciones Disponibles</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => updateStatus({ status: 'delivered' })}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Marcar como Entregado
          </Button>
        </div>
      </div>
    )
  }

  return null // No hay acciones para delivered o cancelled
}
