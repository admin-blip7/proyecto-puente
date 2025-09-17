"use client";

import { useEffect, useRef, useState } from "react";
import { StockEntryItem, LabelSettings } from "@/types";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getLabelSettings } from "@/lib/services/settingsService";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";

interface PrintLabelsViewProps {
  items: StockEntryItem[];
  onDone: () => void;
}

interface LabelData {
  name: string;
  sku: string;
  price: number;
}

export default function PrintLabelsView({ items, onDone }: PrintLabelsViewProps) {
  const [settings, setSettings] = useState<LabelSettings | null>(null);
  const [numCopies, setNumCopies] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      getLabelSettings().then(data => {
          setSettings(data);
          setIsLoading(false);
      });
  }, []);
  
  const labels: LabelData[] = [];
  items.forEach(item => {
    const copies = item.isNew ? item.quantity * numCopies : numCopies;
    for (let i = 0; i < copies; i++) {
      labels.push({
        name: item.name,
        sku: item.sku,
        price: Number(item.price) || 0,
      });
    }
  });

  useEffect(() => {
    if (!isLoading && settings) {
        labels.forEach((_, index) => {
            const canvas = document.getElementById(`barcode-${index}`) as HTMLCanvasElement;
            if (canvas && _.sku) {
                JsBarcode(canvas, _.sku, {
                    format: "CODE128",
                    displayValue: false,
                    height: settings.barcodeHeight,
                    width: 1.5,
                    margin: 0,
                });
            }
        });
    }
  }, [labels, settings, isLoading]);

  const handlePrint = () => {
    window.print();
  };
  
  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-48">
              <Loader2 className="animate-spin h-8 w-8" />
              <p className="ml-4">Cargando diseño de etiquetas...</p>
          </div>
      )
  }
  
  if (!settings) return <p>Error al cargar la configuración de las etiquetas.</p>;

  const labelStyle: React.CSSProperties = {
    width: `${settings.width}mm`,
    height: `${settings.height}mm`,
    fontSize: `${settings.fontSize}px`,
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .label-grid {
             display: block; /* Change from grid to block for printing */
          }
          .label {
            border: none;
            overflow: hidden;
            page-break-after: always; /* Force a page break after each label */
          }
          @page {
            size: auto; /* Let the printer decide the page size */
            margin: 0;
          }
        }
      `}</style>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Impresión de Etiquetas</CardTitle>
            <CardDescription>Se han generado {labels.length} etiquetas. Revisa la vista previa y procede a imprimir.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-end gap-4">
            <Button onClick={onDone} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Button>
            <div className="space-y-1.5">
                <Label htmlFor="copies">Copias por producto</Label>
                <Input 
                    id="copies" 
                    type="number" 
                    value={numCopies}
                    onChange={(e) => setNumCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24"
                    min="1"
                />
            </div>
            <Button onClick={handlePrint} className="sm:ml-auto">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Etiquetas
            </Button>
          </CardContent>
        </Card>
        
        <div id="print-area">
          <div className="label-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            {labels.map((label, index) => (
              <div 
                key={index} 
                style={labelStyle}
                className="label border p-1 flex flex-col items-center justify-center break-words"
              >
                 {settings.includeLogo && settings.logoUrl && (
                    <Image src={settings.logoUrl} alt="logo" width={20} height={15} className="object-contain" />
                )}
                {settings.content.showStoreName && <p className="font-bold leading-tight">{settings.storeName}</p>}
                {settings.content.showProductName && <p className="font-bold leading-tight text-center">{label.name}</p>}

                <svg id={`barcode-${index}`} className="w-full"></svg>
                
                {settings.content.showSku && <p className="tracking-widest" style={{ fontSize: `${settings.fontSize-1}px` }}>{label.sku}</p>}
                {settings.content.showPrice && <p className="font-bold" style={{ fontSize: `${settings.fontSize+2}px`}}>${label.price.toFixed(2)}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
