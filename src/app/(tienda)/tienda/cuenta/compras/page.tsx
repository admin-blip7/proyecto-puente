'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks'
import { getSales } from '@/lib/services/salesService'
import { Sale } from '@/types'
import { Loader2, Package, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

export default function OrdersPage() {
    const { user } = useAuth()
    const [orders, setOrders] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchOrders() {
            if (!user) return
            try {
                const { sales } = await getSales('all', 0, 50, '', '', '', user.id)
                setOrders(sales)
            } catch (error) {
                console.error('Error fetching orders:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchOrders()
    }, [user])

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Mis Compras</h1>

            {orders.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No tienes compras aún</h3>
                    <p className="text-muted-foreground mb-6">Explora nuestra tienda y encuentra lo que buscas.</p>
                    <Link
                        href="/tienda"
                        className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                        Ir a la Tienda
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-card border border-border rounded-xl p-4 sm:p-6 transition-shadow hover:shadow-md">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <div>
                                    <p className="font-semibold">Pedido #{order.saleId}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${order.deliveryStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                                            order.deliveryStatus === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {order.status === 'cancelled' ? 'Cancelado' : (order.deliveryStatus || 'Pendiente')}
                                    </span>
                                    <p className="font-bold">{formatCurrency(order.totalAmount)}</p>
                                </div>
                            </div>

                            <div className="border-t border-border pt-4">
                                <div className="flex flex-col gap-2 mb-4">
                                    {order.items.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                {item.quantity}x {item.name}
                                            </span>
                                        </div>
                                    ))}
                                    {order.items.length > 3 && (
                                        <p className="text-xs text-muted-foreground">+ {order.items.length - 3} artículos más</p>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    {/* Link to detail could be added here if we implement detail page */}
                                    {order.trackingNumber && (
                                        <p className="text-sm text-muted-foreground mr-4">
                                            Tracking: <span className="font-mono text-foreground">{order.trackingNumber}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
