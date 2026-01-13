"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, Loader2, RefreshCcw, CheckCircle2, Share2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Sale, TicketSettings, Product } from "@/types";
import { getTicketSettings } from "@/lib/services/settingsService";
import PrintableTicket from "../admin/settings/PrintableTicket";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import ChangeProductDialog from "./ChangeProductDialog";
import { getProducts } from "@/lib/services/productService";
import { getSaleChanges, createProductChange } from "@/lib/services/salesChangeService";
import { useToast } from "@/hooks/use-toast";
import { SalesChange } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface SaleSummaryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  products?: Product[]; // Optional, if not passed we fetch them
}

export default function SaleSummaryDialog({ isOpen, onOpenChange, sale, products: initialProducts }: SaleSummaryDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<TicketSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [changes, setChanges] = useState<SalesChange[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getTicketSettings()
        .then(setSettings)
        .finally(() => setIsLoading(false));

      if (products.length === 0) {
        getProducts().then(setProducts).catch(console.error);
      }

      getSaleChanges(sale.id).then(setChanges).catch(console.error);
    }
  }, [isOpen, sale.id]);

  const handleProcessChange = async (params: any) => {
    const result = await createProductChange(params);
    if (!result.success) {
      throw new Error(result.error);
    }
    setShowChangeDialog(false);
    onOpenChange(false); // Close summary after successful change
    toast({ title: "Éxito", description: "Cambio registrado correctamente." });
  };

  const createTicketPdf = async () => {
    const ticketElement = printAreaRef.current?.querySelector('.ticket-preview');
    if (!ticketElement || !settings) {
      console.error("No se encontró el elemento del ticket para generar el PDF.");
      return null;
    }

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
    return pdf.output('blob');
  };

  const handlePrintTicket = async () => {
    setIsGeneratingPdf(true);
    try {
      const ticketElement = printAreaRef.current?.querySelector('.ticket-preview');
      if (!ticketElement || !settings) {
        console.error("No se encontró el elemento del ticket para imprimir.");
        toast({ title: "Error", description: "No se encontró el ticket para imprimir.", variant: "destructive" });
        return;
      }

      // Capture ticket as image using html2canvas
      const canvas = await html2canvas(ticketElement as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');

      // Create a new popup window - smaller size to look like a popup
      const printWindow = window.open('', 'PrintTicket', 'width=320,height=500,left=100,top=100,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes');
      if (!printWindow) {
        toast({ title: "Error", description: "No se pudo abrir la ventana de impresión. Desactiva el bloqueador de popups.", variant: "destructive" });
        return;
      }

      // Write the print page with the ticket image - auto prints on load
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Imprimir Ticket</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              background: white;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding: 0;
              margin: 0;
            }
            .ticket-img {
              width: 58mm;
              max-width: 100%;
              height: auto;
              display: block;
            }
            @media print {
              @page { 
                size: 58mm auto; 
                margin: 0; 
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <img src="${imgData}" alt="Ticket" class="ticket-img" />
          <script>
            // Auto-print when loaded
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 100);
            };
            // Close window after print (or cancel)
            window.onafterprint = function() {
              window.close();
            };
            // Also close on escape key
            document.onkeydown = function(e) {
              if (e.key === 'Escape') window.close();
            };
          <\/script>
        </body>
        </html>
      `);
      printWindow.document.close();

    } catch (error) {
      console.error("Error al imprimir el ticket:", error);
      toast({ title: "Error", description: "No se pudo generar el ticket para imprimir.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareTicket = async () => {
    setIsSharing(true);
    try {
      const pdfBlob = await createTicketPdf();
      if (!pdfBlob) {
        return;
      }
      const fileName = `ticket-${sale.saleId || sale.id}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Ticket de venta",
          text: "Aquí está tu ticket de compra.",
          files: [file],
        });
        toast({ title: "Compartido", description: "Ticket enviado correctamente." });
        return;
      }

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = pdfUrl;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(pdfUrl);
      toast({ title: "Descarga lista", description: "Se descargó el ticket para compartirlo." });
    } catch (error) {
      console.error("Error al compartir el PDF:", error);
      toast({ title: "Error", description: "No se pudo compartir el ticket." });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Ticket de Venta</DialogTitle>
          <p className="text-sm text-muted-foreground">Resumen listo para el cliente.</p>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] px-6 py-4 bg-muted/40">
          {isLoading || !settings ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="animate-spin" />
            </div>
          ) : (
            <div ref={printAreaRef} className="flex flex-col items-center gap-4">
              <PrintableTicket settings={settings} sale={sale} />
              {changes.length > 0 && (
                <div className="w-full">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? "Ocultar historial de cambios" : `Ver historial de cambios (${changes.length})`}
                  </Button>
                  {showHistory && (
                    <div className="space-y-3 mt-3">
                      {changes.map(change => (
                        <Card key={change.id} className="p-3 text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold text-red-600 line-through">
                              {change.originalQuantity}x {change.originalProductName}
                            </div>
                            <Badge variant={change.priceDifference > 0 ? "default" : "secondary"}>
                              {change.priceDifference > 0 ? "Cobro extra" : "Reembolso"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-semibold text-green-600">
                              → {change.newQuantity}x {change.newProductName}
                            </div>
                            <div className="font-bold">
                              {formatCurrency(Math.abs(change.priceDifference))}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            <div><span className="font-medium">Razón:</span> {change.changeReason || "Sin razón"}</div>
                            <div className="mt-1 flex justify-between">
                              <span>Por: {change.performedByName}</span>
                              <span>{new Date(change.createdAt).toLocaleDateString()} {new Date(change.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="px-6 pb-6">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Venta Exitosa
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              El ticket ha sido generado correctamente. Seleccione una acción para continuar.
            </p>
            <div className="mt-4 grid gap-2">
              <Button onClick={handlePrintTicket} disabled={isLoading || isGeneratingPdf || isSharing}>
                {isGeneratingPdf ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="mr-2 h-4 w-4" />
                )}
                Imprimir Ticket
              </Button>
              <Button
                variant="outline"
                onClick={handleShareTicket}
                disabled={isLoading || isGeneratingPdf || isSharing}
              >
                {isSharing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" />
                )}
                Compartir Digital
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || isGeneratingPdf || isSharing}
              >
                Nueva Venta
              </Button>
            </div>
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setShowChangeDialog(true)}
                disabled={isLoading || isGeneratingPdf || isSharing || sale.status === 'cancelled'}
                className="text-xs"
              >
                <RefreshCcw className="mr-2 h-3 w-3" />
                Cambiar Producto
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <ChangeProductDialog
        sale={sale}
        isOpen={showChangeDialog}
        onOpenChange={setShowChangeDialog}
        products={products}
        onProcessChange={handleProcessChange}
      />
    </Dialog>
  );
}
