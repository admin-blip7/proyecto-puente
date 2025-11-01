"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Sale, TicketSettings } from "@/types";
import { getTicketSettings } from "@/lib/services/settingsService";
import PrintableTicket from "../admin/settings/PrintableTicket";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface SaleSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
}

export default function SaleSummaryDialog({ isOpen, onOpenChange, sale }: SaleSummaryDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<TicketSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getTicketSettings()
        .then(setSettings)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const handleDownloadPdf = async () => {
    const ticketElement = printAreaRef.current?.querySelector('.ticket-preview');
    if (!ticketElement || !settings) {
        console.error("No se encontró el elemento del ticket para generar el PDF.");
        return;
    }

    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(ticketElement as HTMLElement, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');

      const pdfWidth = 58;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Auto print
      pdf.autoPrint();
      const pdfBlob = pdf.output('bloburl');
      window.open(pdfBlob.toString(), '_blank');

    } catch (error) {
        console.error("Error al generar el PDF:", error);
    } finally {
        setIsGeneratingPdf(false);
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isGeneratingPdf}>
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          <Button onClick={handleDownloadPdf} disabled={isLoading || isGeneratingPdf}>
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Imprimir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
