"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, X, Loader2, RefreshCcw } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [showChangeDialog, setShowChangeDialog] = useState(false);
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
      // Auto print disabled
      // pdf.autoPrint();
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
              <Tabs defaultValue="receipt" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="receipt">Recibo</TabsTrigger>
                  <TabsTrigger value="history">Historial de Cambios ({changes.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="receipt" className="flex justify-center mt-4">
                  <PrintableTicket settings={settings} sale={sale} />
                </TabsContent>
                <TabsContent value="history">
                  {changes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No hay cambios registrados.</div>
                  ) : (
                    <div className="space-y-3 mt-4">
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
                </TabsContent>
              </Tabs>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading || isGeneratingPdf}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowChangeDialog(true)}
              disabled={isLoading || isGeneratingPdf || sale.status === 'cancelled'}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Cambiar Producto
            </Button>
            <Button onClick={handleDownloadPdf} disabled={isLoading || isGeneratingPdf}>
              {isGeneratingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Imprimir Recibo
            </Button>
          </div>
        </DialogFooter>
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
