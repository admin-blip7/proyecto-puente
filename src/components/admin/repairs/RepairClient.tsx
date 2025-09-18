"use client";

import { useState, useMemo } from "react";
import { RepairOrder, Product, TicketSettings, LabelSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddRepairDialog from "./AddRepairDialog";
import EditRepairDialog from "./EditRepairDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getStatusVariant } from "@/lib/utils";
import PrintRepairDocumentsDialog from "./PrintRepairDocumentsDialog";

interface RepairClientProps {
  initialOrders: RepairOrder[];
  allSpareParts: Product[];
  ticketSettings: TicketSettings;
  labelSettings: LabelSettings;
}

export default function RepairClient({ initialOrders, allSpareParts, ticketSettings, labelSettings }: RepairClientProps) {
  const [orders, setOrders] = useState<RepairOrder[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [newlyCreatedOrder, setNewlyCreatedOrder] = useState<RepairOrder | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isPrintDialogOpen, setPrintDialogOpen] = useState(false);


  const handleOrderAdded = (newOrder: RepairOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    setNewlyCreatedOrder(newOrder);
    setPrintDialogOpen(true);
  };

  const handleOrderUpdated = (updatedOrder: RepairOrder) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setEditDialogOpen(false);
    setSelectedOrder(null);
  };
  
  const handleOpenEditDialog = (order: RepairOrder) => {
    setSelectedOrder(order);
    setEditDialogOpen(true);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Reparaciones</h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Orden de Reparación
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-250px)] w-full">
            <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>ID Orden</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((order) => (
                    <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.orderId}</TableCell>
                        <TableCell>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                        </TableCell>
                        <TableCell>
                            <p className="font-medium">{order.deviceBrand} {order.deviceModel}</p>
                            <p className="text-sm text-muted-foreground font-mono">{order.deviceSerialIMEI}</p>
                        </TableCell>
                        <TableCell>{format(order.createdAt, "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(order.status)}>
                                {order.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">${order.totalPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(order)}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar Orden</span>
                           </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <AddRepairDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onOrderAdded={handleOrderAdded}
      />
      {selectedOrder && (
        <EditRepairDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setEditDialogOpen}
          order={selectedOrder}
          onOrderUpdated={handleOrderUpdated}
          allSpareParts={allSpareParts}
        />
      )}
      {newlyCreatedOrder && (
        <PrintRepairDocumentsDialog
          isOpen={isPrintDialogOpen}
          onOpenChange={setPrintDialogOpen}
          order={newlyCreatedOrder}
          ticketSettings={ticketSettings}
          labelSettings={labelSettings}
        />
      )}
    </>
  );
}
