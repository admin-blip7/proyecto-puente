"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  id: string;
  name: string;
  sku: string;
  price: number;
  barcodeUrl?: string;
  date: string;
}

export default function PrintLabelsView({ items: stockItems, onDone }: PrintLabelsViewProps) {
  const [settings, setSettings] = useState<LabelSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getLabelSettings().then(data => {
      setSettings(data);
      setIsLoading(false);
    });
  }, []);

  const labels: LabelData[] = useMemo(() => {
    const expanded: LabelData[] = [];
    stockItems.forEach(item => {
      const quantity = Math.max(0, parseInt(String(item.quantity || 0), 10));
      for (let i = 0; i < quantity; i++) {
        expanded.push({
          id: `${item.id || item.productId}-${i}`,
          name: (item.name || "").toString(),
          sku: (item.sku || "").toString(),
          price: Number(item.price) || 0,
          date: new Date().toLocaleDateString(),
        });
      }
    });
    return expanded;
  }, [stockItems]);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading || !settings || labels.length === 0) return;

    let cancelled = false;

    async function waitForAssets() {
      // 1. Generate barcodes
      labels.forEach((label, index) => {
        const canvas = document.getElementById(`barcode-${index}`) as HTMLCanvasElement;
        if (canvas && label.sku) {
          try {
            JsBarcode(canvas, label.sku, {
              format: "CODE128",
              displayValue: false,
              height: settings.barcodeHeight,
              width: 1.5,
              margin: 0,
            });
          } catch (e) {
            console.warn("Invalid SKU for barcode generation:", label.sku);
          }
        }
      });

      // 2. Wait for fonts
      try {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch (e) {
        console.error("Font loading error:", e);
      }
      
      // 3. Wait for all images (if any)
      const imgs = Array.from(containerRef.current?.querySelectorAll("img") || []);
      await Promise.all(
        imgs.map(img =>
          new Promise(resolve => {
            if (img.complete && img.naturalWidth > 0) {
              resolve(true);
            } else {
              img.addEventListener("load", () => resolve(true), { once: true });
              img.addEventListener("error", () => resolve(false), { once: true });
            }
          })
        )
      );

      if (!cancelled) {
        setReady(true);
      }
    }

    waitForAssets();

    return () => {
      cancelled = true;
    };
  }, [labels, settings, isLoading]);


  const handlePrint = () => {
      setIsPrinting(true);
      requestAnimationFrame(() => {
          window.print();
          setIsPrinting(false);
          onDone();
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin h-8 w-8" />
        <p className="ml-4">Cargando diseño de etiquetas...</p>
      </div>
    );
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
        @page {
            size: ${settings.width}mm ${settings.height}mm;
            margin: 0;
        }
        @media print {
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
              width: ${settings.width}mm;
              height: ${settings.height}mm;
              overflow: hidden;
          }
          body > div:first-child {
            display: none;
          }
          #print-area {
            display: block !important;
          }
          .label {
            width: 100%;
            height: 100%;
            visibility: visible;
            position: absolute;
            top: 0;
            left: 0;
            page-break-after: always;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 2mm;
          }
           .label:last-child {
            page-break-after: auto;
          }
           .no-print {
            display: none;
           }
        }
      `}</style>

    <div className="space-y-4 no-print">
        <Card>
            <CardHeader>
                <CardTitle>Vista Previa de Impresión</CardTitle>
                <CardDescription>
                    Se han generado {labels.length} etiquetas. Presiona el botón para imprimir.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-end gap-4">
                <Button onClick={onDone} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                 <Button onClick={handlePrint} className="sm:ml-auto" disabled={!ready || isPrinting}>
                    {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4" />}
                    Imprimir Etiquetas
                 </Button>
            </CardContent>
        </Card>
    </div>

      <div id="print-area" ref={containerRef}>
        {labels.map((label, index) => (
          <div
            key={label.id}
            style={labelStyle}
            className="label border p-1 flex flex-col items-center justify-center break-words bg-white text-black"
          >
            {settings.includeLogo && settings.logoUrl && (
              <Image src={settings.logoUrl} alt="logo" width={20} height={15} className="object-contain" />
            )}
            {settings.content.showStoreName && <p className="font-bold leading-tight">{settings.storeName || "\u00A0"}</p>}
            {settings.content.showProductName && <p className="font-bold leading-tight text-center">{label.name || "\u00A0"}</p>}

            <canvas id={`barcode-${index}`} className="w-full"></canvas>

            {settings.content.showSku && <p className="tracking-widest" style={{ fontSize: `${settings.fontSize - 1}px` }}>{label.sku || "\u00A0"}</p>}
            {settings.content.showPrice && <p className="font-bold" style={{ fontSize: `${settings.fontSize + 2}px`}}>{label.price ? `$${label.price.toFixed(2)}` : "\u00A0"}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
