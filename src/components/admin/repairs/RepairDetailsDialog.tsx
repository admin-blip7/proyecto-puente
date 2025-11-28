"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RepairOrder, RepairStatus } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency, getStatusVariant } from "@/lib/utils";
import {
  ChevronLeft,
  Bell,
  CheckCircle,
  ShoppingCart,
  FileText,
  Share,
  Home,
  Wrench,
  User,
  Settings,
  Smartphone,
  Battery,
  Check,
  Square,
  CheckSquare,
  Download,
  Plus,
  Edit2,
  Save,
  X
} from "lucide-react";

interface RepairDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: RepairOrder | null;
  onOrderUpdated?: (order: RepairOrder) => void;
}

const statusIcons = {
  "Recibido": { icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900" },
  "En progreso": { icon: CheckCircle, color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-900" },
  "Listo para Entrega": { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900" },
  "Cancelado": { icon: CheckCircle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900" },
  "Completado": { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900" },
};

const serviceIcons = {
  "Cambio de pantalla": Smartphone,
  "Batería nueva": Battery,
  "Limpieza por humedad": Smartphone,
  "Cambio de lente de cámara": Smartphone,
  "Limpieza de altavoz": Smartphone,
};

export default function RepairDetailsDialog({
  isOpen,
  onOpenChange,
  order,
  onOrderUpdated,
}: RepairDetailsDialogProps) {
  const [notes, setNotes] = useState(order?.technicianNotes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [editingParts, setEditingParts] = useState(false);
  const [editingSteps, setEditingSteps] = useState(false);
  const [services, setServices] = useState<any[]>(order?.partsUsed || []);
  const [partsNeeded, setPartsNeeded] = useState<any[]>(order?.partsUsed || []);
  const [repairSteps, setRepairSteps] = useState([
    { id: 1, text: "Diagnóstico inicial completo.", completed: true },
    { id: 2, text: "Reparar dispositivo.", completed: order?.status !== "Recibido" },
    { id: 3, text: "Pruebas finales y calibración.", completed: order?.status === "Listo para Entrega" || order?.status === "Completado" }
  ]);
  const [newService, setNewService] = useState("");
  const [newPart, setNewPart] = useState("");
  const [newPartStatus, setNewPartStatus] = useState("En stock");

  // Función segura para formatear fechas
  const safeFormat = (date: Date | string | undefined, formatStr: string) => {
    if (!date) return "Fecha no disponible";
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "Fecha inválida";
      return format(dateObj, formatStr, { locale: es });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Error en fecha";
    }
  };

  // Resetear estados cuando la orden cambia
  useMemo(() => {
    if (order) {
      setNotes(order.technicianNotes || "");
      setServices(order.partsUsed || []);
      setPartsNeeded(order.partsUsed || []);
      setRepairSteps((order as any).repairSteps || [
        { id: 1, text: "Diagnóstico inicial completo.", completed: true },
        { id: 2, text: "Reparar dispositivo.", completed: order.status !== "Recibido" },
        { id: 3, text: "Pruebas finales y calibración.", completed: order.status === "Listo para Entrega" || order.status === "Completado" }
      ]);
      setNewService("");
      setNewPart("");
      setNewPartStatus("En stock");
      setEditingServices(false);
      setEditingParts(false);
      setEditingSteps(false);
    }
  }, [order]);

  // Función para manejar el estado de la orden
  const handleStatusChange = async (newStatus: RepairStatus) => {
    if (!order) return;

    try {
      const response = await fetch('/api/repairs/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          status: newStatus,
          completedAt: newStatus === 'Completado' ? new Date().toISOString() : null
        }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        onOrderUpdated?.(updatedOrder);
      } else {
        console.error('Error updating status');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Función para guardar notas
  const handleSaveNotes = async () => {
    if (!order || isSavingNotes) return;

    setIsSavingNotes(true);
    try {
      const response = await fetch('/api/repairs/update-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          technicianNotes: notes
        }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        onOrderUpdated?.(updatedOrder);
        alert('Notas guardadas exitosamente');
      } else {
        alert('Error al guardar las notas');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar las notas');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Función para generar y descargar informe PDF
  const handleDownloadReport = () => {
    if (!order) return;

    const reportContent = `
INFORME DE REPARACIÓN - FIXIT
================================

Orden: #${order.orderId}
Fecha: ${safeFormat(order.createdAt, "dd/MM/yyyy HH:mm")}
Cliente: ${order.customerName}
Teléfono: ${order.customerPhone}

Dispositivo:
-----------
Marca: ${order.deviceBrand}
Modelo: ${order.deviceModel}
IMEI: ${order.deviceSerialIMEI || 'N/A'}

Problema Reportado:
------------------
${order.reportedIssue}

Estado Actual: ${order.status}
${order.completedAt ? `Fecha de Finalización: ${safeFormat(order.completedAt, "dd/MM/yyyy HH:mm")}` : ''}

Notas del Técnico:
-------------------
${notes || 'Sin notas'}

Servicios Realizados:
---------------------
${order.partsUsed.length > 0
        ? order.partsUsed.map(part => `- ${part.name} (x${part.quantity}) - $${formatCurrency(part.price)}`).join('\n')
        : 'No se han agregado servicios'
      }

Costos:
-------
Total: ${formatCurrency(order.totalPrice)}

================================
Firma del Técnico: _________________
Firma del Cliente: _________________
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe_reparacion_${order.orderId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Función para ordenar partes (simulado)
  const handleOrderPart = () => {
    if (!order) return;
    alert(`Función de ordenar partes para la orden #${order.orderId}\n\nEsta funcionalidad estará disponible próximamente.`);
  };

  // Funciones para manejar servicios
  const handleAddService = () => {
    if (newService.trim()) {
      const serviceItem = {
        id: Date.now(),
        name: newService,
        quantity: 1,
        price: 0
      };
      setServices([...services, serviceItem]);
      setNewService("");
    }
  };

  const handleRemoveService = (id: number) => {
    setServices(services.filter(s => s.id !== id));
  };

  // Funciones para manejar partes
  const handleAddPart = () => {
    if (newPart.trim()) {
      const partItem = {
        id: Date.now(),
        name: newPart,
        quantity: 1,
        price: 0,
        status: newPartStatus
      };
      setPartsNeeded([...partsNeeded, partItem]);
      setNewPart("");
      setNewPartStatus("En stock");
    }
  };

  const handleRemovePart = (id: number) => {
    setPartsNeeded(partsNeeded.filter(p => p.id !== id));
  };

  const handleUpdatePartStatus = (id: number, status: string) => {
    setPartsNeeded(partsNeeded.map(p =>
      p.id === id ? { ...p, status } : p
    ));
  };

  // Funciones para manejar pasos de reparación
  const handleToggleStep = (id: number) => {
    setRepairSteps(repairSteps.map(step =>
      step.id === id ? { ...step, completed: !step.completed } : step
    ));
  };

  const handleSaveChanges = async () => {
    if (!order) return;

    try {
      const response = await fetch('/api/repairs/update-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          services: services,
          partsNeeded: partsNeeded,
          repairSteps: repairSteps
        }),
      });

      if (response.ok) {
        const updatedOrder = await response.json();
        onOrderUpdated?.(updatedOrder);
        setEditingServices(false);
        setEditingParts(false);
        setEditingSteps(false);
        alert('Cambios guardados exitosamente');
      } else {
        alert('Error al guardar los cambios');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar los cambios');
    }
  };

  const timelineEvents = useMemo(() => {
    if (!order) return [];

    const events = [
      {
        title: "Orden Creada",
        time: safeFormat(order.createdAt, "dd 'de' MMMM, yyyy - HH:mm a"),
        description: `${order.customerName} ingresó el dispositivo para reparación.`,
      },
    ];

    if (order.status !== "Recibido") {
      events.push({
        title: "Diagnóstico Inicial",
        time: safeFormat(order.createdAt, "dd 'de' MMMM, yyyy - HH:mm a"),
        description: "Se confirmó el daño en el dispositivo. Se recomienda reparación.",
      });
    }

    if (["En Diagnóstico", "Esperando Refacción", "En Reparación"].includes(order.status)) {
      events.push({
        title: "En Reparación",
        time: safeFormat(new Date(), "dd 'de' MMMM, yyyy - HH:mm a"),
        description: "El dispositivo está siendo reparado actualmente.",
      });
    }

    if (order.status === "Listo para Entrega" || order.status === "Completado") {
      events.push({
        title: "Reparación Completada",
        time: safeFormat(order.completedAt, "dd 'de' MMMM, yyyy - HH:mm a"),
        description: "La reparación ha sido completada exitosamente.",
      });
    }

    return events;
  }, [order]);

  if (!order) return null;

  const statusInfo = statusIcons[order.status as keyof typeof statusIcons] || statusIcons["Recibido"];
  const StatusIcon = statusInfo.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Detalles de la Orden de Reparación</DialogTitle>
        <DialogDescription>
          Vista detallada de la orden de reparación incluyendo información del cliente, servicios, y estado actual
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="max-w-2xl p-0 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Detalles de la Orden</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Avatar className="w-10 h-10">
                <AvatarImage src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7jl5ChHCrsdsoIdTQKf7Bi1c4H4izyhQeg-hCrMeWnONdccJe3Up_202pFcSSBYgEsdLTPZLUEhlJAtpckLqXYqMCukazSj1nw6OCs-eaCZSWmrvu1DECdh9FSDp1fyonMMkZtySwkNQd4-P9N8QSp2lTDhMxH89MpZgh9X5jIWKEX0vHwFnnvlEXXk9pu9Sx8kiXQaFpgDeE8q_mlsHE8AMXwmH9mBuGszy8EfDKZX8LVN-hR9g4fDSnALuNlzp62XHvuM2V-ExO" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Customer Info Card */}
          <div className="bg-card dark:bg-card/50 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Avatar className="w-12 h-12 mr-3">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${order.customerName}`} />
                  <AvatarFallback>{order.customerName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{order.customerName}</p>
                  <p className="text-sm text-muted-foreground">Orden #{order.orderId}</p>
                </div>
              </div>
              <Badge className={`${statusInfo.bg} ${statusInfo.color} border-0`}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {order.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
              <p><span className="font-medium">Modelo:</span> {order.deviceBrand} {order.deviceModel}</p>
              <p><span className="font-medium">IMEI:</span> {order.deviceSerialIMEI || 'N/A'}</p>
              <p><span className="font-medium">Color:</span> N/A</p>
              <p><span className="font-medium">Almacenamiento:</span> N/A</p>
              <p className="col-span-2"><span className="font-medium">Condición:</span> {order.reportedIssue}</p>
              <p><span className="font-medium">Ingresado:</span> {safeFormat(order.createdAt, "yyyy-MM-dd HH:mm")}</p>
              <p className="col-span-2 text-xl font-bold mt-2">Total Estimado: {formatCurrency(order.totalPrice)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4 space-y-6">
          {/* Quick Actions */}
          <section className="bg-card dark:bg-card/50 p-4 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold mb-3">Acciones Rápidas</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="bg-green-600 text-white py-3 hover:bg-green-700"
                onClick={() => handleStatusChange('Completado')}
                disabled={order?.status === 'Completado'}
              >
                <Check className="w-5 h-5 mr-2" />
                Marcar como completo
              </Button>
              <Button
                className="bg-yellow-600 text-white py-3 hover:bg-yellow-700"
                onClick={handleOrderPart}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ordenar parte
              </Button>
              <Button
                variant="secondary"
                className="py-3"
                onClick={() => alert('Función de compartir informe estará disponible próximamente')}
              >
                <Share className="w-5 h-5 mr-2" />
                Compartir informe
              </Button>
              <Button
                variant="secondary"
                className="py-3"
                onClick={handleDownloadReport}
              >
                <Download className="w-5 h-5 mr-2" />
                Descargar informe
              </Button>
            </div>
          </section>

          {/* Repair Details */}
          <section className="bg-card dark:bg-card/50 p-4 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold mb-3">Detalles de la Reparación</h2>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-muted-foreground">Servicios Solicitados:</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingServices(!editingServices)}
                >
                  {editingServices ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </Button>
              </div>

              {editingServices ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm border rounded-md"
                      placeholder="Agregar nuevo servicio..."
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddService()}
                    />
                    <Button size="sm" onClick={handleAddService}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {services.map((service, index) => {
                      const Icon = serviceIcons[service.name as keyof typeof serviceIcons] || Smartphone;
                      return (
                        <li key={service.id || index} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Icon className="w-5 h-5 mr-2 text-primary" />
                            <span>{service.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{service.quantity}x</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveService(service.id || index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <>
                  {services.length > 0 ? (
                    <ul className="space-y-2">
                      {services.slice(0, 2).map((part, index) => {
                        const Icon = serviceIcons[part.name as keyof typeof serviceIcons] || Smartphone;
                        return (
                          <li key={index} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Icon className="w-5 h-5 mr-2 text-primary" />
                              <span>{part.name}</span>
                            </div>
                            <span className="text-sm font-medium">{part.quantity}x</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No se han agregado servicios</p>
                  )}
                </>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-muted-foreground">Partes Necesarias:</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingParts(!editingParts)}
                >
                  {editingParts ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </Button>
              </div>

              {editingParts ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 text-sm border rounded-md"
                      placeholder="Agregar nueva parte..."
                      value={newPart}
                      onChange={(e) => setNewPart(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddPart()}
                    />
                    <select
                      className="px-3 py-2 text-sm border rounded-md"
                      value={newPartStatus}
                      onChange={(e) => setNewPartStatus(e.target.value)}
                    >
                      <option value="En stock">En stock</option>
                      <option value="Por ordenar">Por ordenar</option>
                      <option value="En camino">En camino</option>
                      <option value="Agotado">Agotado</option>
                    </select>
                    <Button size="sm" onClick={handleAddPart}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {partsNeeded.map((part, index) => (
                      <li key={part.id || index} className="flex justify-between items-center">
                        <span>{part.name}</span>
                        <div className="flex items-center gap-2">
                          <select
                            className="text-sm border rounded px-2 py-1"
                            value={part.status || "En stock"}
                            onChange={(e) => handleUpdatePartStatus(part.id || index, e.target.value)}
                          >
                            <option value="En stock">En stock</option>
                            <option value="Por ordenar">Por ordenar</option>
                            <option value="En camino">En camino</option>
                            <option value="Agotado">Agotado</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePart(part.id || index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  {partsNeeded.length > 0 ? (
                    <ul className="space-y-2">
                      {partsNeeded.map((part, index) => (
                        <li key={index} className="flex justify-between">
                          <span>{part.name}</span>
                          <span className="text-sm text-muted-foreground">
                            Estado: {part.status || "En stock"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No se han agregado partes</p>
                  )}
                </>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-muted-foreground">Pasos de Reparación:</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSteps(!editingSteps);
                    if (editingSteps) {
                      handleSaveChanges();
                    }
                  }}
                >
                  {editingSteps ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </Button>
              </div>
              <ul className="space-y-2">
                {repairSteps.map((step) => (
                  <li
                    key={step.id}
                    className={`flex items-center ${editingSteps ? 'cursor-pointer hover:bg-muted/50 p-2 rounded' : ''}`}
                    onClick={() => editingSteps && handleToggleStep(step.id)}
                  >
                    {step.completed ? (
                      <CheckSquare className="w-5 h-5 mr-2 text-green-500" />
                    ) : (
                      <Square className="w-5 h-5 mr-2 text-muted-foreground" />
                    )}
                    <span className={step.completed ? 'line-through text-muted-foreground' : ''}>
                      {step.text}
                    </span>
                    {editingSteps && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Click para cambiar estado
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-muted-foreground">Notas Diagnósticas:</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes || notes === order?.technicianNotes}
                >
                  {isSavingNotes ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
              <Textarea
                className="w-full p-3 rounded-lg bg-muted border border-border focus:ring-primary focus:border-primary text-sm resize-none"
                placeholder="Añadir notas del diagnóstico..."
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </section>

          {/* Order History */}
          <section className="bg-card dark:bg-card/50 p-4 rounded-xl shadow-sm pb-20">
            <h2 className="text-lg font-bold mb-4">Historial de la Orden</h2>
            <div className="relative pl-2">
              {timelineEvents.map((event, index) => (
                <div key={index} className="timeline-item">
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.time}</p>
                  <p className="text-sm mt-1">{event.description}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollArea>

        {/* Bottom Navigation (Mobile Style) */}
        <div className="border-t bg-card dark:bg-card/50 p-4 flex justify-around items-center">
          <Button variant="ghost" className="flex flex-col items-center h-auto p-2">
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Inicio</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center h-auto p-2">
            <Wrench className="w-5 h-5" />
            <span className="text-xs mt-1">Reparaciones</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center h-auto p-2">
            <User className="w-5 h-5" />
            <span className="text-xs mt-1">Clientes</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center h-auto p-2">
            <Settings className="w-5 h-5" />
            <span className="text-xs mt-1">Ajustes</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}