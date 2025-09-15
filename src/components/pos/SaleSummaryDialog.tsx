"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Sale, TicketSettings } from "@/types";
import { getTicketSettings } from "@/lib/services/settingsService";
import PrintableTicket from "../admin/settings/PrintableTicket";

interface SaleSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
}

export default function SaleSummaryDialog({ isOpen, onOpenChange, sale }: SaleSummaryDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<TicketSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getTicketSettings()
        .then(setSettings)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '', 'height=800,width=400');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Recibo de Venta</title>');
        // Injecting tailwind-like styles for printing
        printWindow.document.write(`
          <style>
            body { font-family: 'Courier New', Courier, monospace; margin: 0; }
            .ticket-preview { width: 80mm; background-color: white; color: black; padding: 12px; font-size: 14px; }
            .text-center { text-align: center; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .mb-4 { margin-bottom: 1rem; }
            .font-bold { font-weight: 700; }
            .text-lg { font-size: 1.125rem; }
            hr { border-style: dashed; border-color: black; margin-top: 0.5rem; margin-bottom: 0.5rem; border-top-width: 1px; }
            table { width: 100%; }
            .pb-1 { padding-bottom: 0.25rem; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .align-top { vertical-align: top; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .pt-1 { padding-top: 0.25rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .mt-4 { margin-top: 1rem; }
            .pt-2 { padding-top: 0.5rem; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Recibo de Venta</DialogTitle>
          <DialogDescription>
            Este es el recibo para el cliente.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] my-4 bg-muted rounded-lg flex items-center justify-center p-4">
            {isLoading || !settings ? (
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="animate-spin" />
                </div>
            ) : (
                <div ref={printAreaRef} className="flex justify-center">
                    <PrintableTicket settings={settings} sale={sale} />
                </div>
            )}
        </ScrollArea>
        <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          <Button onClick={handlePrint} disabled={isLoading}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
