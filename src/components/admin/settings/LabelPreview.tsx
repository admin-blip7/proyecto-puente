"use client";

import { LabelSettings } from "@/types";
import JsBarcode from 'jsbarcode';
import { useEffect } from "react";
import Image from "next/image";

interface LabelPreviewProps {
  settings: LabelSettings;
}

const sampleItem = {
    name: "Mica Hidrogel iPhone 15 Pro Max",
    sku: "123456789012",
    price: 250.00
}

export default function LabelPreview({ settings }: LabelPreviewProps) {

  useEffect(() => {
    try {
      if (document.getElementById('barcode-preview')) {
          JsBarcode('#barcode-preview', sampleItem.sku, {
              format: "CODE128",
              displayValue: false,
              height: settings.barcodeHeight,
              width: 1.5,
              margin: 0,
          });
      }
    } catch(e) {
        // Can fail if SKU is invalid during typing
        console.error(e);
    }
  }, [settings.barcodeHeight, sampleItem.sku]);

  const labelStyle: React.CSSProperties = {
    width: `${settings.width}mm`,
    height: `${settings.height}mm`,
    fontSize: `${settings.fontSize}px`,
  };

  return (
    <div 
        className="grid grid-cols-3 gap-2 p-2 border bg-white"
        style={{
            width: "215.9mm", // US Letter width
            minHeight: "100mm",
        }}
    >
      {[...Array(3)].map((_, index) => (
        <div 
            key={index}
            style={labelStyle}
            className="border border-dashed p-1 flex flex-col items-center justify-center break-words text-black"
        >
             {settings.includeLogo && settings.logoUrl && (
                <Image src={settings.logoUrl} alt="logo" width={20} height={20} className="object-contain" />
            )}
            {settings.content.showStoreName && <p className="font-bold leading-tight">{settings.storeName}</p>}
            {settings.content.showProductName && <p className="font-bold leading-tight text-center">{sampleItem.name}</p>}

            <svg id={index === 0 ? 'barcode-preview' : `barcode-preview-${index}`} className="w-full"></svg>
            
            {settings.content.showSku && <p className="tracking-widest" style={{ fontSize: `${settings.fontSize-1}px` }}>{sampleItem.sku}</p>}
            {settings.content.showPrice && <p className="font-bold" style={{ fontSize: `${settings.fontSize+2}px`}}>${sampleItem.price.toFixed(2)}</p>}
        </div>
      ))}
    </div>
  );
}
