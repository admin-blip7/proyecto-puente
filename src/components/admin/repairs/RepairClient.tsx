"use client";

import { useState, useMemo } from "react";
import { RepairOrder, Product, TicketSettings, LabelSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, MoreHorizontal, Printer } from "lucide-react";
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
import { formatCurrency, getStatusVariant } from "@/lib/utils";
import PrintRepairDocumentsDialog from "./PrintRepairDocumentsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import JsBarcode from 'jsbarcode';


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

  const handlePrint = (order: RepairOrder, type: 'ticket' | 'label') => {
    const isLabel = type === 'label';

    const printWindow = window.open('', 'PRINT', 'height=800,width=800');
    if (!printWindow) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }

    printWindow.document.write('<html><head><title>Imprimir</title>');

    let content = '';
    if (isLabel) {
      printWindow.document.write(`
          <style>
              @page { size: ${labelSettings.width}mm ${labelSettings.height}mm; margin: 0; }
              body { margin: 0; padding: 0; }
          </style>
      `);
      // Extract a short failure summary (first line or short text)
      const failureSummary = order.reportedIssue.split('\n')[0].substring(0, 30) + (order.reportedIssue.length > 30 ? '...' : '');
      const workSummary = order.partsUsed.map(p => p.name).join(', ').substring(0, 40) + (order.partsUsed.length > 0 ? '...' : '');

      content = `
          <div class="label" style="width: ${labelSettings.width}mm; height: ${labelSettings.height}mm; box-sizing: border-box; padding: 2mm; display: flex; flex-direction: column; align-items: center; text-align: center; overflow: hidden; font-family: sans-serif; font-size: 10px; line-height: 1.2;">
              <div style="font-weight: 900; font-size: 14px; margin-bottom: 2px;">${order.orderId}</div>
              <svg id="barcode-${order.orderId}" style="width: 95%; height: ${labelSettings.barcodeHeight}px; display: block; margin: 0 auto;"></svg>
              
              <div style="width: 100%; border-top: 1px solid #000; margin-top: 4px; padding-top: 2px;">
                <div style="font-weight: bold; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${order.customerName}</div>
                <div style="font-size: 10px;">${order.customerPhone}</div>
              </div>

              <div style="width: 100%; margin-top: 2px;">
                <div style="font-weight: bold; font-size: 11px;">${order.deviceBrand} ${order.deviceModel}</div>
              </div>
              
              <div style="width: 100%; text-align: left; margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 2px;">
                 <div style="display: flex; gap: 4px;">
                    <strong style="min-width: 35px;">Falla:</strong> 
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${failureSummary || 'N/A'}</span>
                 </div>
                 <div style="display: flex; gap: 4px;">
                    <strong style="min-width: 35px;">Realizar:</strong> 
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${workSummary || 'Revisión'}</span>
                 </div>
              </div>
          </div>
      `;
    } else {
      const { header, body, footer } = ticketSettings;
      content = `
            <div style="width: 80mm; font-family: 'Courier New', Courier, monospace; color: black; padding: 3mm; font-size: ${body.fontSize === 'xs' ? '10px' : body.fontSize === 'sm' ? '12px' : '14px'};">
                <div style="text-align: center; margin-bottom: 1rem;">
                ${header.showLogo && header.logoUrl ? `<img src="${header.logoUrl}" alt="Logo" style="max-width: 60px; max-height: 60px; margin: 0 auto;"/>` : ''}
                ${header.show.storeName ? `<h1 style="font-size: 1.2em; font-weight: bold;">${header.storeName}</h1>` : ''}
                ${header.show.address ? `<p>${header.address}</p>` : ''}
                ${header.show.phone ? `<p>Tel: ${header.phone}</p>` : ''}
                </div>
                <p>Folio: ${order.orderId}</p>
                <p>Fecha: ${format(order.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}</p>
                <p>Cliente: ${order.customerName} (${order.customerPhone})</p>
                <hr style="border-top: 1px dashed black; margin: 0.5rem 0;" />
                <p><strong>Dispositivo:</strong> ${order.deviceBrand} ${order.deviceModel}</p>
                <p><strong>Falla Reportada:</strong></p>
                <p>${order.reportedIssue}</p>
                <hr style="border-top: 1px dashed black; margin: 0.5rem 0;" />
                <div style="font-size: 0.8em; margin-top: 1rem;">
                    <p><strong>Términos y Condiciones:</strong></p>
                    <p>No nos hacemos responsables por equipos abandonados después de 30 días. La revisión causa un costo de $150 MXN si el equipo no es reparado.</p>
                </div>
                <div style="margin-top: 2rem; border-top: 1px solid black; padding-top: 0.5rem;">
                    <p>Firma de Conformidad del Cliente</p>
                </div>
            </div>
        `;
    }

    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');

    if (isLabel) {
      try {
        JsBarcode(printWindow.document.getElementById(`barcode-${order.orderId}`), order.orderId, {
          format: 'CODE128', displayValue: false, height: labelSettings.barcodeHeight, width: 1.5, margin: 0,
        });
      } catch (e) { console.error(e); }
    }

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };


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
                      <TableCell className="text-right font-semibold">{formatCurrency(order.totalPrice)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleOpenEditDialog(order)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar Orden
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => handlePrint(order, 'ticket')}>
                                  Reimprimir Ticket de Cliente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrint(order, 'label')}>
                                  Reimprimir Etiqueta
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          ticketSettings={ticketSettings}
          labelSettings={labelSettings}
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
