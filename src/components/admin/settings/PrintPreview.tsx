"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { LabelSettings, LabelPrintItem, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Download, Printer, Loader2 } from "lucide-react";
import { generateLabelPdf, previewLabelsPdf } from "@/lib/printing/labelPdfGenerator";
import { getProducts } from "@/lib/services/productService";
import { getConsignors } from "@/lib/services/consignorService";
import { getSuppliers } from "@/lib/services/supplierService";

interface PrintPreviewProps {
  settings: LabelSettings;
  onOpenChange?: (open: boolean) => void;
}

export default function PrintPreview({ settings, onOpenChange }: PrintPreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [totalLabels, setTotalLabels] = useState(0);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [consignors, setConsignors] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  // Load available products, consignors, and suppliers
  useEffect(() => {
    const loadData = async () => {
      try {
        const [products, consignorsData, suppliersData] = await Promise.all([
          getProducts(),
          getConsignors(),
          getSuppliers()
        ]);
        setAvailableProducts(products.slice(0, 20)); // Limit to first 20 for performance
        setConsignors(consignorsData);
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const consignorMap = useMemo(() => new Map(consignors.map((c) => [c.id, c.name])), [consignors]);
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const resolveSupplierName = (product: Product): string | undefined => {
    type SupplierCandidate = {
      supplierName?: string;
      supplier?: string;
      supplierId?: string;
    };

    const candidate = product as unknown as SupplierCandidate;

    if (candidate.supplierName && candidate.supplierName.trim().length > 0) {
      return candidate.supplierName;
    }
    if (candidate.supplier && candidate.supplier.trim().length > 0) {
      return candidate.supplier;
    }
    if (candidate.supplierId) {
      return supplierMap.get(candidate.supplierId) ?? undefined;
    }
    return undefined;
  };

  // Calculate total labels whenever quantities change
  useEffect(() => {
    const total = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
    setTotalLabels(total);
  }, [quantities]);

  // Update preview when products or quantities change
  useEffect(() => {
    if (selectedProducts.length === 0) {
      setPreviewHtml("");
      return;
    }

    const updatePreview = async () => {
      setLoading(true);
      try {
        const printItems: LabelPrintItem[] = selectedProducts.map(product => {
          const supplierName = resolveSupplierName(product);
          const consignorName = product.consignorId ? consignorMap.get(product.consignorId) : undefined;
          
          return {
            product: {
              id: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              cost: product.cost,
              stock: product.stock,
              ownershipType: product.ownershipType,
              consignorName,
              supplierName,
              category: product.category,
              attributes: product.attributes,
            },
            quantity: quantities[product.id] || 1,
          };
        });

        const html = await previewLabelsPdf(printItems, settings);
        setPreviewHtml(html);
      } catch (error) {
        console.error("Error generating preview:", error);
        setPreviewHtml(`<div style="padding: 20px; color: red;">Error al generar vista previa: ${error instanceof Error ? error.message : 'Error desconocido'}</div>`);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(updatePreview, 500); // Debounce preview updates
    return () => clearTimeout(timeoutId);
  }, [selectedProducts, quantities, settings]);

  const handleProductSelect = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    if (product && !selectedProducts.find(p => p.id === productId)) {
      setSelectedProducts(prev => [...prev, product]);
      setQuantities(prev => ({ ...prev, [productId]: 1 }));
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [productId]: Math.max(0, quantity) }));
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    setQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[productId];
      return newQuantities;
    });
  };

  const handleGeneratePdf = async () => {
    if (selectedProducts.length === 0 || totalLabels === 0) return;

    setGeneratingPdf(true);
    try {
      const printItems: LabelPrintItem[] = selectedProducts.map(product => {
        const supplierName = resolveSupplierName(product);
        const consignorName = product.consignorId ? consignorMap.get(product.consignorId) : undefined;
        
        return {
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            ownershipType: product.ownershipType,
            consignorName,
            supplierName,
            category: product.category,
            attributes: product.attributes,
          },
          quantity: quantities[product.id] || 1,
        };
      });

      await generateLabelPdf(printItems, settings);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    if (selectedProducts.length === 0 || totalLabels === 0) return;

    setGeneratingPdf(true);
    try {
      const printItems: LabelPrintItem[] = selectedProducts.map(product => {
        const supplierName = resolveSupplierName(product);
        const consignorName = product.consignorId ? consignorMap.get(product.consignorId) : undefined;
        
        return {
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            ownershipType: product.ownershipType,
            consignorName,
            supplierName,
            category: product.category,
            attributes: product.attributes,
          },
          quantity: quantities[product.id] || 1,
        };
      });

      const pdfBlob = await generateLabelPdf(printItems, settings, { returnBlob: true }) as Blob;
      
      // Create object URL and open in new window for printing
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (printWindow) {
        // Wait for the window to fully load before attempting to print
        const checkLoaded = () => {
          try {
            if (printWindow.document.readyState === 'complete') {
              printWindow.print();
              // Clean up after printing
              setTimeout(() => {
                printWindow.close();
                URL.revokeObjectURL(url);
              }, 1000); // Give more time for print dialog to appear
            } else {
              setTimeout(checkLoaded, 100);
            }
          } catch (error) {
            console.error('Error checking window state:', error);
            // Fallback: try to print anyway
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
              URL.revokeObjectURL(url);
            }, 1000);
          }
        };
        
        // Start checking after a short delay to ensure window is initialized
        setTimeout(checkLoaded, 500);
      } else {
        // Fallback: download the PDF instead
        const filename = `etiquetas-${new Date().toISOString().split('T')[0]}.pdf`;
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        alert('No se pudo abrir la ventana de impresión. El PDF se ha descargado automáticamente.');
      }
    } catch (error) {
      console.error("Error printing PDF:", error);
      alert(`Error al imprimir PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Previsualizador de Impresión PDF
          </CardTitle>
          <CardDescription>
            Configura productos y cantidades para previsualizar cómo se verán las etiquetas en formato PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product-select">Agregar Producto</Label>
              <Select onValueChange={handleProductSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                Total de etiquetas: <span className="font-semibold text-primary">{totalLabels}</span>
              </div>
            </div>
          </div>

          {selectedProducts.length > 0 && (
            <div className="space-y-2">
              <Label>Productos seleccionados</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedProducts.map(product => (
                  <div key={product.id} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.sku}</div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={quantities[product.id] || 1}
                      onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                      className="w-16 h-8"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProduct(product.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleGeneratePdf}
              disabled={selectedProducts.length === 0 || totalLabels === 0 || generatingPdf}
              className="flex-1"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </>
              )}
            </Button>
            <Button
              onClick={handlePrintPdf}
              variant="outline"
              disabled={selectedProducts.length === 0 || totalLabels === 0 || generatingPdf}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewHtml && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa</CardTitle>
            <CardDescription>
              Esta es una vista previa de cómo se verán las etiquetas en el PDF. Se muestran máximo 2 etiquetas por producto para la previsualización.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <iframe
                  ref={previewFrameRef}
                  srcDoc={previewHtml}
                  className="w-full h-96 border-0"
                  title="Vista previa de etiquetas"
                  sandbox="allow-scripts allow-same-origin"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}