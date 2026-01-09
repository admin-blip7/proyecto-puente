"use client";

import { FC, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RepairOrder } from "@/types";
import { Printer, Download, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RepairTicketProps {
  isOpen: boolean;
  onClose: () => void;
  repairOrder: RepairOrder;
}

export const RepairTicket: FC<RepairTicketProps> = ({
  isOpen,
  onClose,
  repairOrder,
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (ticketRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const ticketContent = ticketRef.current.innerHTML;
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Ticket de Reparación - ${repairOrder.orderId}</title>
              <style>
                body {
                  font-family: 'Courier New', monospace;
                  max-width: 400px;
                  margin: 0 auto;
                  padding: 20px;
                  background: white;
                }
                .ticket-header {
                  text-align: center;
                  border-bottom: 2px dashed #000;
                  padding-bottom: 10px;
                  margin-bottom: 20px;
                }
                .ticket-title {
                  font-size: 18px;
                  font-weight: bold;
                  margin: 0;
                }
                .ticket-subtitle {
                  font-size: 12px;
                  color: #666;
                  margin: 5px 0;
                }
                .ticket-section {
                  margin-bottom: 15px;
                }
                .ticket-label {
                  font-weight: bold;
                  font-size: 12px;
                  margin-bottom: 3px;
                }
                .ticket-value {
                  font-size: 12px;
                  margin-bottom: 8px;
                }
                .ticket-items {
                  border: 1px solid #ddd;
                  padding: 10px;
                  margin: 10px 0;
                  background: #f9f9f9;
                }
                .ticket-item {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 5px;
                  font-size: 11px;
                }
                .ticket-total {
                  border-top: 1px solid #000;
                  padding-top: 10px;
                  margin-top: 10px;
                  font-weight: bold;
                }
                .ticket-footer {
                  text-align: center;
                  border-top: 2px dashed #000;
                  padding-top: 10px;
                  margin-top: 20px;
                  font-size: 10px;
                  color: #666;
                }
                .status-badge {
                  display: inline-block;
                  padding: 2px 8px;
                  border-radius: 12px;
                  font-size: 10px;
                  font-weight: bold;
                  text-transform: uppercase;
                }
                .status-recibido { background: #fef3c7; color: #92400e; }
                .status-diagnostico { background: #dbeafe; color: #1e40af; }
                .status-reparando { background: #f3e8ff; color: #6b21a8; }
                .status-listo { background: #d1fae5; color: #065f46; }
                .status-entregado { background: #e5e7eb; color: #374151; }
              </style>
            </head>
            <body>
              ${ticketContent}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = () => {
    if (ticketRef.current) {
      const ticketContent = ticketRef.current.innerText;
      const blob = new Blob([ticketContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket_${repairOrder.orderId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Recibido": return "bg-yellow-100 text-yellow-800";
      case "Diagnóstico": return "bg-blue-100 text-blue-800";
      case "Reparando": return "bg-purple-100 text-purple-800";
      case "Listo": return "bg-green-100 text-green-800";
      case "Entregado": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold">Ticket de Reparación</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div ref={ticketRef} className="bg-white p-6 rounded-lg shadow-sm">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-dashed">
            <h2 className="text-xl font-bold mb-1">🔧 Servicio Técnico 🔧</h2>
            <p className="text-sm text-gray-600">Especialistas en Reparación Móvil</p>
          </div>

          {/* Order Info */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">No. Orden:</span>
              <span className="font-mono font-bold text-lg">{repairOrder?.orderId || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-sm">Fecha:</span>
              <span className="text-sm">
                {repairOrder?.createdAt ? format(new Date(repairOrder.createdAt), "dd/MM/yyyy HH:mm", { locale: es }) : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm">Estado:</span>
              <Badge className={`text-xs ${getStatusColor(repairOrder?.status || "Recibido")}`}>
                {repairOrder?.status || "Recibido"}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Customer Info */}
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">Datos del Cliente</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Nombre:</span>
                <span className="text-sm font-medium">{repairOrder?.customerName || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Teléfono:</span>
                <span className="text-sm font-medium">{repairOrder?.customerPhone || "N/A"}</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Device Info */}
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">Datos del Dispositivo</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Marca:</span>
                <span className="text-sm font-medium">{repairOrder?.deviceBrand || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Modelo:</span>
                <span className="text-sm font-medium">{repairOrder?.deviceModel || "N/A"}</span>
              </div>
              {repairOrder?.deviceSerialIMEI && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">IMEI/Serie:</span>
                  <span className="text-sm font-medium">{repairOrder.deviceSerialIMEI}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Reported Issues */}
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">Problema Reportado</h3>
            <div className="bg-gray-50 p-3 rounded text-sm">
              {repairOrder?.reportedIssue || "No especificado"}
            </div>
          </div>

          {/* Services/Parts */}
          {repairOrder?.partsUsed && repairOrder.partsUsed.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-2">Servicios y Piezas</h3>
                <div className="space-y-2">
                  {repairOrder.partsUsed.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="text-gray-500 ml-1">x{item.quantity}</span>
                        )}
                      </div>
                      <span className="font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Labor Cost */}
          {repairOrder?.laborCost && repairOrder.laborCost > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">Mano de Obra:</span>
                  <span className="font-medium">${repairOrder.laborCost.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}

          <Separator className="my-4" />

          {/* Total */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>TOTAL A PAGAR:</span>
              <span className="text-green-600">
                ${repairOrder?.totalPrice?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>

          {/* Notes */}
          {repairOrder?.technicianNotes && (
            <>
              <Separator className="my-4" />
              <div className="mb-4">
                <h3 className="font-bold text-sm mb-2">Notas</h3>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  {repairOrder.technicianNotes}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="text-center pt-4 border-t-2 border-dashed text-xs text-gray-500">
            <p>¡Gracias por su confianza!</p>
            <p className="mt-1">Guarde este ticket para futuras referencias</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button onClick={handlePrint} className="flex-1" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleDownload} variant="outline" className="flex-1" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};