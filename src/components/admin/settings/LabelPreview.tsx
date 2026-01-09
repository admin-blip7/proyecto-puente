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
    labelType?: 'product' | 'repair';
}

const sampleProductItem = {
    name: "Mica Hidrogel iPhone 15 Pro Max",
    sku: "123456789012",
    price: 250.00
}

const sampleRepairItem = {
    orderId: "REP-0014",
    customerName: "Juan Pérez",
    customerPhone: "555-123-4567",
    deviceModel: "iPhone 13",
    deviceBrand: "Apple",
    reportedIssue: "Pantalla rota, no da imagen.\nEl touch no responde.",
    partsUsed: [{ name: "Pantalla OLED" }, { name: "Adhesivo Display" }]
}

export default function LabelPreview({ settings, labelType = 'product' }: LabelPreviewProps) {
    const barcodeCanvasRef = useRef<HTMLCanvasElement | null>(null);

    const previewMetrics = useMemo(() => {
        // Apply orientation: swap dimensions if vertical
        const actualWidth = settings.orientation === 'vertical' ? settings.height : settings.width;
        const actualHeight = settings.orientation === 'vertical' ? settings.width : settings.height;

        const baseWidthPx = mmToPixels(actualWidth);
        const baseHeightPx = mmToPixels(actualHeight);

        // No scaling limits - show actual label dimensions
        const scale = 1;

        return {
            baseWidthPx,
            baseHeightPx,
            actualWidth,
            actualHeight,
            scale,
        };
    }, [settings.width, settings.height, settings.orientation]);

    useEffect(() => {
        if (!barcodeCanvasRef.current) return;
        try {
            barcodeCanvasRef.current.width = previewMetrics.baseWidthPx;
            barcodeCanvasRef.current.height = settings.barcodeHeight;

            const barcodeValue = labelType === 'repair' ? sampleRepairItem.orderId : sampleProductItem.sku;

            JsBarcode(barcodeCanvasRef.current, barcodeValue, {
                format: "CODE128",
                displayValue: false,
                height: settings.barcodeHeight,
                width: 1.5,
                margin: 0,
            });
        } catch (error) {
            console.error("Barcode preview failed", error);
        }
    }, [previewMetrics.baseWidthPx, settings.barcodeHeight, labelType]);

    const labelStyle: React.CSSProperties = {
        width: `${previewMetrics.actualWidth}mm`,
        height: `${previewMetrics.actualHeight}mm`,
        fontSize: `${settings.fontSize}px`,
    };

    // Calculate logo size based on label dimensions (approximately 15% of label height)
    const logoSize = Math.max(12, Math.min(previewMetrics.actualHeight * 0.15, previewMetrics.actualWidth * 0.25));

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
                    {labelType === 'repair' ? (
                        // Repair Label Preview
                        <>
                            <div style={{ fontWeight: 900, fontSize: '14px', marginBottom: '2px' }}>{sampleRepairItem.orderId}</div>
                            <canvas ref={barcodeCanvasRef} className="w-[95%] block mx-auto my-1" />

                            <div style={{ width: '100%', borderTop: '1px solid #000', marginTop: '4px', paddingTop: '2px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sampleRepairItem.customerName}</div>
                                <div style={{ fontSize: '10px' }}>{sampleRepairItem.customerPhone}</div>
                            </div>

                            <div style={{ width: '100%', marginTop: '2px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>{sampleRepairItem.deviceBrand} {sampleRepairItem.deviceModel}</div>
                            </div>

                            <div style={{ width: '100%', textAlign: 'left', marginTop: '4px', borderTop: '1px dashed #ccc', paddingTop: '2px' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <strong style={{ minWidth: '35px' }}>Falla:</strong>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {sampleRepairItem.reportedIssue.split('\n')[0].substring(0, 30)}...
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <strong style={{ minWidth: '35px' }}>Realizar:</strong>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {sampleRepairItem.partsUsed.map(p => p.name).join(', ').substring(0, 40)}...
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        // Product Label Preview (Default)
                        <>
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
                                <p className="font-semibold leading-tight text-center">{sampleProductItem.name}</p>
                            )}

                            <canvas ref={barcodeCanvasRef} className="w-full" />

                            {settings.content.showSku && (
                                <p className="tracking-widest" style={{ fontSize: `${settings.fontSize - 1}px` }}>
                                    {sampleProductItem.sku}
                                </p>
                            )}
                            {settings.content.showPrice && (
                                <p className="font-bold" style={{ fontSize: `${settings.fontSize + 2}px` }}>
                                    {formatMXNAmount(sampleProductItem.price)}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

