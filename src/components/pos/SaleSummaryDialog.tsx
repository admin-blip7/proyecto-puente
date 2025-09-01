"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X } from "lucide-react";
import { useRef } from "react";

interface SaleSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
}

export default function SaleSummaryDialog({ isOpen, onOpenChange, summary }: SaleSummaryDialogProps) {
  const summaryRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = summaryRef.current?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Resumen de Venta</title>');
        printWindow.document.write('<style>body { font-family: sans-serif; } pre { white-space: pre-wrap; word-wrap: break-word; }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<pre>' + summary + '</pre>');
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Resumen de la Venta</DialogTitle>
          <DialogDescription>
            Este es el recibo para el cliente.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] my-4 rounded-md border p-4">
          <pre ref={summaryRef} className="text-sm whitespace-pre-wrap font-mono">
            {summary}
          </pre>
        </ScrollArea>
        <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
