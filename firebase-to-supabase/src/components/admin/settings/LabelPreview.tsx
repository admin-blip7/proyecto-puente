"use client";

import { LabelSettings } from "@/types";
import JsBarcode from 'jsbarcode';
import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { formatMXNAmount } from "@/lib/validation/currencyValidation";

const MM_TO_PX = 3.7795275591;

const mmToPixels = (mm: number) => mm * MM_TO_PX;

interface LabelPreviewProps {
  settings: LabelSettings;
}

const sampleItem = {
    name: "Mica Hidrogel iPhone 15 Pro Max",
    sku: "123456789012",
    price: 250.00
}

export default function LabelPreview({ settings }: LabelPreviewProps) {
    const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const previewMetrics = useMemo(() => {
    const baseWidthPx = mmToPixels(settings.width);
    const baseHeightPx = mmToPixels(settings.height);
    
    // No scaling limits - show actual label dimensions
    const scale = 1;

    return {
        baseWidthPx,
        baseHeightPx,
        scale,
    };
  }, [settings.width, settings.height]);

  useEffect(() => {
    if (!barcodeCanvasRef.current) return;
    try {
        barcodeCanvasRef.current.width = previewMetrics.baseWidthPx;
        barcodeCanvasRef.current.height = settings.barcodeHeight;
        JsBarcode(barcodeCanvasRef.current, sampleItem.sku, {
            format: "CODE128",
            displayValue: false,
            height: settings.barcodeHeight,
            width: 1.5,
            margin: 0,
        });
    } catch (error) {
        console.error("Barcode preview failed", error);
    }
  }, [previewMetrics.baseWidthPx, settings.barcodeHeight]);

  const labelStyle: React.CSSProperties = {
    width: `${settings.width}mm`,
    height: `${settings.height}mm`,
    fontSize: `${settings.fontSize}px`,
  };

  // Calculate logo size based on label dimensions (approximately 15% of label height)
  const logoSize = Math.max(12, Math.min(settings.height * 0.15, settings.width * 0.25));

  return (
    <div className="w-full flex justify-center">
        <div
            className="border border-dashed bg-white shadow-sm"
            style={{
                width: previewMetrics.baseWidthPx * previewMetrics.scale,
                height: previewMetrics.baseHeightPx * previewMetrics.scale,
                padding: 8,
                boxSizing: "content-box",
            }}
        >
            <div
                className="h-full w-full flex flex-col items-center justify-center text-black"
                style={{
                    ...labelStyle,
                    transform: `scale(${previewMetrics.scale})`,
                    transformOrigin: "top left",
                }}
            >
                {settings.includeLogo && settings.logoUrl && (
                    <Image 
                        src={settings.logoUrl} 
                        alt="logo" 
                        width={Math.round(logoSize)} 
                        height={Math.round(logoSize)} 
                        className="object-contain" 
                    />
                )}
                {settings.content.showStoreName && (
                    <p className="font-bold leading-tight text-center">{settings.storeName}</p>
                )}
                {settings.content.showProductName && (
                    <p className="font-semibold leading-tight text-center">{sampleItem.name}</p>
                )}

                <canvas ref={barcodeCanvasRef} className="w-full" />

                {settings.content.showSku && (
                    <p className="tracking-widest" style={{ fontSize: `${settings.fontSize - 1}px` }}>
                        {sampleItem.sku}
                    </p>
                )}
                {settings.content.showPrice && (
                    <p className="font-bold" style={{ fontSize: `${settings.fontSize + 2}px` }}>
                        {formatMXNAmount(sampleItem.price)}
                    </p>
                )}
            </div>
        </div>
    </div>
  );
}
