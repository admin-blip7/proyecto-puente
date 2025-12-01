"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Tag } from "lucide-react";
import { RepairOrder, TicketSettings, LabelSettings } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import JsBarcode from 'jsbarcode';


interface PrintRepairDocumentsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: RepairOrder;
  ticketSettings: TicketSettings;
  labelSettings: LabelSettings;
}

export default function PrintRepairDocumentsDialog({
  isOpen,
  onOpenChange,
  order,
  ticketSettings,
  labelSettings,
}: PrintRepairDocumentsDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const generateTicketHTML = () => {
    const { header, body, footer } = ticketSettings;
    return `
      <div style="width: 80mm; font-family: 'Courier New', Courier, monospace; color: black; padding: 3mm; font-size: ${body.fontSize === 'xs' ? '10px' : body.fontSize === 'sm' ? '12px' : '14px'};">
        <div style="text-align: center; margin-bottom: 1rem;">
          ${header.showLogo && header.logoUrl ? `<img src="${header.logoUrl}" alt="Logo" style="max-width: 60px; max-height: 60px; margin: 0 auto;"/>` : ''}
          ${header.show.storeName ? `<h1 style="font-size: 1.2em; font-weight: bold;">${header.storeName}</h1>` : ''}
          ${header.show.address ? `<p>${header.address}</p>` : ''}
          ${header.show.phone ? `<p>Tel: ${header.phone}</p>` : ''}
          ${header.show.rfc ? `<p>RFC: ${header.rfc}</p>` : ''}
          ${header.show.website ? `<p>${header.website}</p>` : ''}
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
  };

  const generateLabelHTML = () => {
    const barcodeId = `barcode-${order.orderId}`;
    return `
        <div class="label" style="width: ${labelSettings.width}mm; height: ${labelSettings.height}mm; box-sizing: border-box; padding: 2mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; overflow: hidden; font-size: ${labelSettings.fontSize}px;">
            <div style="font-weight: bold; font-size: 1.2em;">${order.orderId}</div>
            <svg id="${barcodeId}" style="width: 90%; height: ${labelSettings.barcodeHeight}px; margin: 4px 0;"></svg>
            <div>${order.customerName}</div>
            <div style="font-size: 0.9em;">${order.deviceModel}</div>
        </div>
    `;
  };

  const handlePrint = (contentGenerator: () => string, isLabel: boolean) => {
    const printWindow = window.open('', 'PRINT', 'height=600,width=800');
    if (!printWindow) {
      alert("El navegador bloqueó la ventana de impresión. Por favor, habilita las ventanas emergentes.");
      return;
    }

    const content = contentGenerator();

    printWindow.document.write('<html><head><title>Imprimir</title>');
    if (isLabel) {
      printWindow.document.write(`
            <style>
                @page { size: ${labelSettings.width}mm ${labelSettings.height}mm; margin: 0; }
                body { margin: 0; padding: 0; }
            </style>
        `);
    }
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');

    if (isLabel) {
      try {
        JsBarcode(printWindow.document.getElementById(`barcode-${order.orderId}`), order.orderId, {
          format: 'CODE128',
          displayValue: false,
          height: labelSettings.barcodeHeight,
          width: 1.5,
          margin: 0,
        });
      } catch (e) { console.error(e); }
    }

    printWindow.document.close();
    printWindow.focus();

    // Auto-print disabled
    // setTimeout(() => {
    //     printWindow.print();
    //     printWindow.close();
    // }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Orden #{order.orderId} Creada</DialogTitle>
          <DialogDescription>
            La orden se ha guardado. Imprime los documentos necesarios para el cliente y el taller.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 py-4">
          <Button size="lg" onClick={() => handlePrint(generateTicketHTML, false)}>
            <Printer className="mr-2 h-5 w-5" />
            Imprimir Ticket de Cliente
          </Button>
          <Button size="lg" variant="secondary" onClick={() => handlePrint(generateLabelHTML, true)}>
            <Tag className="mr-2 h-5 w-5" />
            Imprimir Etiqueta para Dispositivo
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
