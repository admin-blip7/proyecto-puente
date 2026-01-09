"use client";

import { useState, useMemo } from "react";
import { RepairOrder, Product, TicketSettings, LabelSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, MoreHorizontal, Printer, Receipt, Timer, Check, X, Search, Bell, Smartphone, Battery, Droplets, Camera, Sparkles, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddRepairDialog from "./AddRepairDialog";
import EditRepairDialog from "./EditRepairDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency, getStatusVariant } from "@/lib/utils";
import PrintRepairDocumentsDialog from "./PrintRepairDocumentsDialog";
import RepairDetailsDialog from "./RepairDetailsDialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import JsBarcode from 'jsbarcode';
import { Eye } from "lucide-react";

interface RepairDashboardProps {
  initialOrders: RepairOrder[];
  allSpareParts: Product[];
  ticketSettings: TicketSettings;
  labelSettings: LabelSettings;
}

const statusIcons = {
  "Recibido": Receipt,
  "En progreso": Timer,
  "Listo para Entrega": Check,
  "Cancelado": X,
  "Completado": Check,
  "En Diagnóstico": Timer,
  "Esperando Refacción": Timer,
  "En Reparación": Timer,
};

const serviceIcons = {
  "Cambio de pantalla": Smartphone,
  "Batería nueva": Battery,
  "Limpieza por humedad": Droplets,
  "Cambio de lente de cámara": Camera,
  "Limpieza de altavoz": Sparkles,
};

export default function RepairDashboard({ initialOrders, allSpareParts, ticketSettings, labelSettings }: RepairDashboardProps) {
  const [orders, setOrders] = useState<RepairOrder[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<RepairOrder | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<RepairOrder | null>(null);
  const [newlyCreatedOrder, setNewlyCreatedOrder] = useState<RepairOrder | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isPrintDialogOpen, setPrintDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["Recibido", "Listo para Entrega"]);
  const [searchTerm, setSearchTerm] = useState("");

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
  };

  const handleOpenDetailsDialog = (order: RepairOrder) => {
    setDetailsOrder(order);
    setIsDetailsDialogOpen(true);
  };

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

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(order.status);
      const matchesSearch = searchTerm === "" ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.deviceModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.deviceBrand.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, selectedStatuses, searchTerm]);

  const statusCounts = useMemo(() => {
    const counts = {
      "Recibido": 0,
      "En progreso": 0,
      "Listo para Entrega": 0,
      "Cancelado": 0,
      "Completado": 0,
    };

    orders.forEach(order => {
      if (order.status in counts) {
        counts[order.status as keyof typeof counts]++;
      }
    });

    return counts;
  }, [orders]);

  const handleStatusCardClick = (status: string) => {
    if (selectedStatuses.length === 1 && selectedStatuses[0] === status) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses([status]);
    }
  };

  const statusCards = [
    { key: "Recibido", label: "Nuevas órdenes", color: "blue", bgColor: "bg-blue-100", darkBgColor: "dark:bg-blue-900", iconColor: "text-blue-500" },
    { key: "En progreso", label: "En progreso", color: "yellow", bgColor: "bg-yellow-100", darkBgColor: "dark:bg-yellow-900", iconColor: "text-yellow-500" },
    { key: "Listo para Entrega", label: "Listos para entrega", color: "green", bgColor: "bg-green-100", darkBgColor: "dark:bg-green-900", iconColor: "text-green-500" },
    { key: "Completado", label: "Completadas", color: "green", bgColor: "bg-emerald-100", darkBgColor: "dark:bg-emerald-900", iconColor: "text-emerald-600" },
    { key: "Cancelado", label: "Cancelados", color: "red", bgColor: "bg-red-100", darkBgColor: "dark:bg-red-900", iconColor: "text-red-500" },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FixIt</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={() => setAddDialogOpen(true)} className="bg-primary text-white">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Orden
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Lista
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar ordenes..."
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarImage src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7jl5ChHCrsdsoIdTQKf7Bi1c4H4izyhQeg-hCrMeWnONdccJe3Up_202pFcSSBYgEsdLTPZLUEhlJAtpckLqXYqMCukazSj1nw6OCs-eaCZSWmrvu1DECdh9FSDp1fyonMMkZtySwkNQd4-P9N8QSp2lTDhMxH89MpZgh9X5jIWKEX0vHwFnnvlEXXk9pu9Sx8kiXQaFpgDeE8q_mlsHE8AMXwmH9mBuGszy8EfDKZX8LVN-hR9g4fDSnALuNlzp62XHvuM2V-ExO" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-4">Estado de Reparaciones</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Tarjeta para ver todas las órdenes */}
          <Card
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedStatuses.length === 0 ? 'ring-2 ring-primary' : ''
              }`}
            onClick={() => setSelectedStatuses([])}
          >
            <CardContent className="p-0">
              <p className="text-sm text-muted-foreground">Todas las órdenes</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-3xl font-bold">{orders.length}</p>
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Receipt className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              {selectedStatuses.length === 0 && (
                <div className="mt-2 text-xs text-primary">
                  Mostrando todo
                </div>
              )}
            </CardContent>
          </Card>

          {statusCards.map((card) => {
            const Icon = statusIcons[card.key as keyof typeof statusIcons];
            const isActive = selectedStatuses.length === 1 && selectedStatuses[0] === card.key;
            return (
              <Card
                key={card.key}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${isActive ? 'ring-2 ring-primary' : ''
                  }`}
                onClick={() => handleStatusCardClick(card.key)}
              >
                <CardContent className="p-0">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-3xl font-bold">{statusCounts[card.key as keyof typeof statusCounts]}</p>
                    <div className={`p-2 ${card.bgColor} ${card.darkBgColor} rounded-full`}>
                      <Icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                  </div>
                  {isActive && (
                    <div className="mt-2 text-xs text-primary">
                      Click para limpiar
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-1/4">
          <h3 className="text-lg font-semibold mb-4">Filtros</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Estado</p>
              <div className="space-y-2">
                {Object.keys(statusCounts).map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={status}
                      checked={selectedStatuses.includes(status)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStatuses([...selectedStatuses, status]);
                        } else {
                          setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                        }
                      }}
                    />
                    <label htmlFor={status} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Filtrar por</p>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedStatuses([]);
                  }}
                >
                  Todas las órdenes
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedStatuses(["Recibido"]);
                  }}
                >
                  Nuevas recibidas
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedStatuses(["Listo para Entrega"]);
                  }}
                >
                  Listas para entregar
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedStatuses(["Completado", "Listo para Entrega"]);
                  }}
                >
                  Completadas
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => {
              const isStatusNew = order.status === "Recibido";
              const isStatusInProgress = order.status === "En Diagnóstico" || order.status === "Esperando Refacción" || order.status === "En Reparación";
              const isStatusReady = order.status === "Listo para Entrega" || order.status === "Completado";
              const isStatusCancelled = order.status === "Cancelado";

              return (
                <Card key={order.id} className="p-4 shadow-lg relative">
                  <span className={`absolute top-4 right-4 text-xs font-semibold px-2 py-1 rounded-full ${isStatusNew ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" :
                    isStatusInProgress ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300" :
                      isStatusReady ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300" :
                        "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300"
                    }`}>
                    {order.status}
                  </span>

                  <div className="flex items-center mb-3">
                    <Avatar className="w-10 h-10 mr-3">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${order.customerName}`} />
                      <AvatarFallback>{order.customerName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="text-sm text-muted-foreground">Orden #{order.orderId}</p>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground mb-3">
                    <p><strong>Modelo:</strong> {order.deviceBrand} {order.deviceModel}</p>
                    <p><strong>Pago total:</strong> {formatCurrency(order.totalPrice)}</p>
                  </div>

                  {order.partsUsed.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {order.partsUsed.slice(0, 2).map((part, index) => {
                        const Icon = serviceIcons[part.name as keyof typeof serviceIcons] || Smartphone;
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Icon className="h-5 w-5 mr-2 text-primary" />
                              <p className="text-sm">{part.name}</p>
                            </div>
                            <span className="text-sm text-muted-foreground">{part.quantity}x</span>
                          </div>
                        );
                      })}
                      {order.partsUsed.length > 2 && (
                        <p className="text-xs text-muted-foreground">+{order.partsUsed.length - 2} más</p>
                      )}
                    </div>
                  )}

                  {order.technicianNotes && (
                    <p className="text-sm text-muted-foreground mb-4">
                      <span className="font-medium">Notas:</span> {order.technicianNotes}
                    </p>
                  )}

                  {order.reportedIssue && !order.technicianNotes && (
                    <p className="text-sm text-muted-foreground mb-4">
                      <span className="font-medium">Falla:</span> {order.reportedIssue}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenDetailsDialog(order)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
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
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </div>

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
      {detailsOrder && (
        <RepairDetailsDialog
          isOpen={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          order={detailsOrder}
          onOrderUpdated={(updatedOrder) => {
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            setDetailsOrder(updatedOrder);
          }}
        />
      )}
    </>
  );
}