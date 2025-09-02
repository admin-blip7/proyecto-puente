"use client";

import { useEffect, useRef } from "react";
import { StockEntryItem } from "@/types";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
  const printAreaRef = useRef<HTMLDivElement>(null);
  const labels: LabelData[] = [];

  // Create an array of all individual labels
  items.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      labels.push({
        name: item.name,
        sku: item.sku,
        price: item.price,
      });
    }
  });

  useEffect(() => {
    // Generate barcodes for all canvas elements
    labels.forEach((_, index) => {
      const canvas = document.getElementById(`barcode-${index}`) as HTMLCanvasElement;
      if (canvas) {
        JsBarcode(canvas, _.sku, {
          format: "CODE128",
          displayValue: false, // We'll display the text value separately
          height: 30,
          width: 1.5,
          margin: 0,
        });
      }
    });
  }, [labels]);

  const handlePrint = () => {
    window.print();
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
             display: grid;
             grid-template-columns: repeat(3, 1fr);
             gap: 0;
             page-break-inside: avoid;
          }
          .label {
            border: 1px dotted #ccc;
            page-break-inside: avoid;
          }
          @page {
            size: letter;
            margin: 0.5in;
          }
        }
      `}</style>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Impresión de Etiquetas</CardTitle>
            <CardDescription>Se han generado {labels.length} etiquetas. Revisa la vista previa y procede a imprimir.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button onClick={onDone} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Etiquetas
            </Button>
          </CardContent>
        </Card>
        
        <div id="print-area" ref={printAreaRef}>
          <div className="label-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            {labels.map((label, index) => (
              <div key={index} className="label border p-2 text-center break-words flex flex-col items-center justify-center space-y-1" style={{ width: '2.625in', height: '1in' }}>
                <p className="text-[9px] font-bold leading-tight truncate w-full">{label.name}</p>
                <canvas id={`barcode-${index}`} className="w-full"></canvas>
                <p className="text-[8px] tracking-widest">{label.sku}</p>
                <p className="text-xs font-bold">${label.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
