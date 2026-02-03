'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Plus,
  Calendar,
  DollarSign,
  User,
  Trash,
  ArrowUpDown
} from 'lucide-react';
import { getLogger } from "@/lib/logger";
import { formatCurrency } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
const log = getLogger("PurchaseOrdersClient");

interface PurchaseOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  // Campos alternativos presentes en otras rutas del flujo de compras
  qty?: number;
  unitCost?: number;
  totalCost?: number;
  cost?: number;
  finalCost?: number;
  salePrice?: number;
  price?: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  status: 'draft' | 'ordered' | 'in_transit' | 'received';
  items: PurchaseOrderItem[];
  totalAmount: number;
  orderDate: any;
  expectedDelivery?: any;
  actualDelivery?: any;
  notes?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  history: Array<{
    action: string;
    status?: string;
    timestamp: any;
    user: string;
    notes?: string;
  }>;
}

const statusConfig = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: Edit },
  ordered: { label: 'Ordenado', color: 'bg-blue-100 text-blue-800', icon: Clock },
  in_transit: { label: 'En Tránsito', color: 'bg-yellow-100 text-yellow-800', icon: Truck },
  received: { label: 'Recibido', color: 'bg-green-100 text-green-800', icon: CheckCircle }
};

export default function PurchaseOrdersClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showReceiveDialog, setShowReceiveDialog] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState('');
  const [sortOption, setSortOption] = useState<string>('none');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/purchase-orders");
      if (!response.ok) {
        throw new Error("Error al cargar órdenes");
      }

      const data = await response.json();
      const ordersData = (data.orders ?? []).map((order: any) => ({
        ...order,
        createdAt: order.createdAt ?? order.created_at,
        updatedAt: order.updatedAt ?? order.updated_at,
        id: order.id,
      })) as PurchaseOrder[];

      // Remove duplicate orders to prevent React key conflicts
      const uniqueOrders = ordersData.filter((order, index, self) =>
        index === self.findIndex(o => o.id === order.id)
      );

      setOrders(uniqueOrders);
    } catch (error) {
      log.error('Error loading purchase orders:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las órdenes de compra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item =>
          (item.productName ?? '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Sorting by avg unit cost
    const computeAvg = (order: PurchaseOrder) => {
      const totalQty = order.items?.reduce((sum, item) => sum + ((item.quantity ?? item.qty ?? 0) as number), 0) ?? 0;
      const sumCost = order.items?.reduce((sum, item) => {
        const unit = (item.finalCost ?? item.unitCost ?? item.cost ?? item.unitPrice ?? 0) as number;
        const qty = (item.quantity ?? item.qty ?? 0) as number;
        return sum + unit * qty;
      }, 0) ?? 0;
      return totalQty > 0 ? (sumCost / totalQty) : 0;
    };

    if (sortOption !== 'none') {
      const sorted = [...filtered].sort((a, b) => {
        const aAvg = computeAvg(a);
        const bAvg = computeAvg(b);
        return sortOption === 'avg_desc' ? bAvg - aAvg : aAvg - bAvg;
      });
      filtered = sorted;
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, sortOption]);

  const updateOrderStatus = useCallback(async (orderId: string, newStatus: PurchaseOrder['status'], notes?: string) => {
    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateStatus',
          orderId,
          newStatus,
          notes: notes ?? null,
          userId: 'Usuario Actual',
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar el estado');
      }

      toast({
        title: "Estado actualizado",
        description: `La orden ha sido marcada como ${statusConfig[newStatus].label.toLowerCase()}`,
      });

      await fetchOrders();
    } catch (error) {
      log.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la orden",
        variant: "destructive",
      });
    }
  }, [fetchOrders, toast]);


  const handleReceiveOrder = async () => {
    if (!selectedOrder) return;

    await updateOrderStatus(selectedOrder.id, 'received', receiveNotes);
    setShowReceiveDialog(false);
    setReceiveNotes('');
    setSelectedOrder(null);
  };



  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  const handleDeleteOrder = async (order: PurchaseOrder) => {
    const ok = typeof window !== 'undefined' ? window.confirm(`¿Eliminar la orden ${order.orderNumber}? Esta acción no se puede deshacer.`) : true;
    if (!ok) return;
    try {
      const response = await fetch(`/api/purchase-orders?orderId=${order.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error eliminando la orden');
      }

      toast({ title: 'Orden eliminada', description: `La orden ${order.orderNumber} fue eliminada.` });
      await fetchOrders();
    } catch (error) {
      log.error('Error deleting order:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar la orden', variant: 'destructive' });
    }
  };

  // Eliminamos el formateador local en EUR y usamos el utilitario global en MXN
  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat('es-ES', {
  //     style: 'currency',
  //     currency: 'EUR'
  //   }).format(amount);
  // };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Órdenes de Compra</h1>
              <p className="text-gray-600">Gestiona y da seguimiento a todas las órdenes de compra</p>
            </div>
          </div>
          <Button
            onClick={() => router.push('/admin/inventory/quick-po-intake')}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Orden</span>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por número de orden, proveedor o producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="ordered">Ordenado</SelectItem>
                    <SelectItem value="in_transit">En Tránsito</SelectItem>
                    <SelectItem value="received">Recibido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-64">
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger>
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin orden</SelectItem>
                    <SelectItem value="avg_desc">Costo promedio unitario (alto → bajo)</SelectItem>
                    <SelectItem value="avg_asc">Costo promedio unitario (bajo → alto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="grid gap-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes</h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No se encontraron órdenes con los filtros aplicados'
                      : 'Aún no hay órdenes de compra registradas'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order, index) => {
              const StatusIcon = statusConfig[order.status].icon;
              const totalQty = order.items?.reduce((sum, item) => sum + ((item.quantity ?? item.qty ?? 0) as number), 0) ?? 0;
              const sumCost = order.items?.reduce((sum, item) => {
                const unit = (item.finalCost ?? item.unitCost ?? item.cost ?? item.unitPrice ?? 0) as number;
                const qty = (item.quantity ?? item.qty ?? 0) as number;
                return sum + unit * qty;
              }, 0) ?? 0;
              const avgUnitCost = totalQty > 0 ? (sumCost / totalQty) : 0;
              return (
                <Card key={`${order.id}-${index}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {order.orderNumber}
                          </h3>
                          <Badge className={statusConfig[order.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[order.status].label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{order.supplier}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(order.orderDate)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">{formatCurrency(order.totalAmount ?? 0)}</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-2 cursor-help">
                                <Package className="h-4 w-4" />
                                <span className="font-medium">{totalQty} productos · Costo promedio: {formatCurrency(avgUnitCost)}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <div>Total de cantidades: <span className="font-medium">{totalQty}</span></div>
                                <div>Suma de costos: <span className="font-medium">{formatCurrency(sumCost)}</span></div>
                                <div>Promedio unitario: <span className="font-medium">{formatCurrency(avgUnitCost)}</span></div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{order.items.length}</span> productos
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowHistoryDialog(true);
                          }}
                          className="flex items-center space-x-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Ver Historial</span>
                        </Button>

                        {order.status === 'in_transit' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowReceiveDialog(true);
                            }}
                            className="flex items-center space-x-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Marcar Recibido</span>
                          </Button>
                        )}

                        {order.status === 'ordered' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'in_transit')}
                            className="flex items-center space-x-2"
                          >
                            <Truck className="h-4 w-4" />
                            <span>En Tránsito</span>
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOrder(order)}
                          className="flex items-center space-x-2"
                          title="Eliminar orden"
                        >
                          <Trash className="h-4 w-4" />
                          <span>Eliminar</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Historial de la Orden {selectedOrder?.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedOrder && (
                <>
                  {/* Order Details */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Detalles de la Orden</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Proveedor:</span>
                        <p className="font-medium">{selectedOrder.supplier}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <p className="font-medium">{formatCurrency(selectedOrder.totalAmount ?? 0)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Fecha de Orden:</span>
                        <p className="font-medium">{formatDate(selectedOrder.orderDate)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Estado Actual:</span>
                        <Badge className={statusConfig[selectedOrder.status].color}>
                          {statusConfig[selectedOrder.status].label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h4 className="font-medium mb-2">Productos ({selectedOrder.items.length})</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                          <div className="flex justify-between items-center">
                            <span>{item.productName}</span>
                            <span className="text-gray-600">
                              {(item.quantity ?? item.qty ?? 0)} × {formatCurrency((item.finalCost ?? item.unitPrice ?? item.unitCost ?? item.cost ?? 0))} = {formatCurrency((item.totalPrice ?? item.totalCost ?? ((item.quantity ?? item.qty ?? 0) * (item.finalCost ?? item.unitPrice ?? item.unitCost ?? item.cost ?? 0))))}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Precio de venta: {formatCurrency(item.salePrice ?? item.price ?? 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* History */}
                  <div>
                    <h4 className="font-medium mb-2">Historial de Cambios</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedOrder.history?.length > 0 ? (
                        selectedOrder.history.map((entry, index) => (
                          <div key={index} className="border-l-2 border-blue-200 pl-4 pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">{entry.action}</p>
                                <p className="text-xs text-gray-600">por {entry.user}</p>
                                {entry.notes && (
                                  <p className="text-xs text-gray-700 mt-1">{entry.notes}</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDate(entry.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 text-sm">No hay historial disponible</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Receive Order Dialog */}
        <Dialog open={showReceiveDialog} onOpenChange={setShowReceiveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar Orden como Recibida</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                ¿Confirmas que has recibido todos los productos de la orden <strong>{selectedOrder?.orderNumber}</strong>?
                Los productos serán automáticamente agregados al inventario.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas adicionales (opcional)
                </label>
                <Textarea
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="Agregar comentarios sobre la recepción..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReceiveDialog(false);
                    setReceiveNotes('');
                    setSelectedOrder(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleReceiveOrder}>
                  Confirmar Recepción
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
