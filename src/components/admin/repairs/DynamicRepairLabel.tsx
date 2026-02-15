import { RepairOrder, LabelSettings } from "@/types";
import { format } from "date-fns";
import { normalizeVisualEditorData, VisualElement } from "@/lib/printing/visualLayoutTypes";
import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from "react";
import { QRCode } from 'react-qrcode-logo';

interface DynamicRepairLabelProps {
    repair: RepairOrder;
    settings: LabelSettings;
}

const BarcodeComponent = ({ value, width, height, showValue }: { value: string, width: number, height: number, showValue?: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current && value) {
            try {
                JsBarcode(canvasRef.current, value, {
                    format: "CODE128",
                    displayValue: showValue,
                    fontSize: 10,
                    margin: 2,
                    height: height * 2, // scale up for better quality
                    width: 2,
                });
            } catch (e) {
                console.error("Barcode generation error", e);
            }
        }
    }, [value, showValue, height]);

    return <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%' }} />;
};

import { AutoFitText } from "../settings/visual-editor/AutoFitText";

export const DynamicRepairLabel = ({ repair, settings }: DynamicRepairLabelProps) => {
    // 1. Parse Layout
    const visualData = normalizeVisualEditorData(
        typeof settings.visualLayout === 'string'
            ? JSON.parse(settings.visualLayout)
            : settings.visualLayout
    );

    const elements = visualData.elements || [];
    const globalStyles = visualData.globalStyles || {};

    // 2. Helper to resolve placeholders
    const resolvePlaceholder = (key?: string) => {
        if (!key) return "";
        switch (key) {
            case 'orderId': return repair.orderId;
            case 'customerName': return repair.customerName;
            case 'customerPhone': return repair.customerPhone || "";
            case 'deviceBrand': return repair.deviceBrand;
            case 'deviceModel': return repair.deviceModel;
            case 'deviceSerial': return repair.deviceSerialIMEI;
            case 'devicePassword': return repair.devicePassword || "NO / NA";
            case 'status': return repair.status;
            case 'repairCost': return `$${repair.laborCost}`;
            case 'totalCost': return `$${repair.totalCost}`;
            case 'reportedIssue': return repair.reportedIssue;
            case 'technicianNotes': return repair.technicianNotes || "";
            case 'printDate': return format(new Date(), "dd/MM/yyyy");
            case 'printDateTime': return format(new Date(), "dd/MM/yyyy HH:mm");
            case 'storeName': return settings.storeName || "";
            default: return "";
        }
    };

    // 3. Render Elements
    return (
        <div
            style={{
                width: `${settings.width}mm`,
                height: `${settings.height}mm`,
                position: "relative",
                overflow: "hidden",
                fontFamily: globalStyles.fontFamily || "Arial, sans-serif",
                backgroundColor: globalStyles.backgroundColor || "#ffffff",
                boxSizing: "border-box", // Ensure padding/border doesn't break size
                ...((globalStyles as any).backgroundImageUrl ? {
                    backgroundImage: `url(${(globalStyles as any).backgroundImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                } : {})
            }}
        >
            {elements.map((element: VisualElement) => {
                const style: React.CSSProperties = {
                    position: "absolute",
                    left: `${element.x}mm`,
                    top: `${element.y}mm`,
                    width: `${element.width}mm`,
                    height: `${element.height}mm`,
                    fontSize: `${element.fontSize}px`,
                    fontWeight: element.fontWeight,
                    textAlign: element.textAlign,
                    fontFamily: element.fontFamily,
                    zIndex: element.zIndex,
                    color: element.color,
                    backgroundColor: element.backgroundColor,
                    // Handle rotation if present in schema
                    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
                    whiteSpace: "normal", // Allow wrapping
                    overflow: "hidden",
                };

                // Helper for Pattern Grid
                if (element.placeholderKey === 'patternGrid') {
                    return (
                        <div key={element.id} style={style}>
                            <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ opacity: 0.8 }}>
                                {[0, 1, 2].map(row =>
                                    [0, 1, 2].map(col => (
                                        <circle
                                            key={`${row}-${col}`}
                                            cx={20 + col * 30}
                                            cy={20 + row * 30}
                                            r="6"
                                            fill="none"
                                            stroke="black"
                                            strokeWidth="2"
                                        />
                                    ))
                                )}
                            </svg>
                        </div>
                    );
                }

                // Barcode Rendering
                if (element.type === 'barcode' || element.placeholderKey === 'barcode') {
                    const value = resolvePlaceholder((element.barcodeValueKey as string) || 'orderId') || repair.orderId;
                    return (
                        <div key={element.id} style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <BarcodeComponent value={value} width={element.width} height={element.height} showValue={element.showValue} />
                        </div>
                    );
                }

                // QR Code
                if (element.type === 'qrcode') {
                    const value = resolvePlaceholder((element.qrPlaceholderKey as string) || 'orderId') || repair.orderId;
                    return (
                        <div key={element.id} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QRCode
                                value={value}
                                size={Math.min(element.width, element.height) * 3.77}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                    )
                }

                // Images
                if (element.type === 'image') {
                    return (
                        <img
                            key={element.id}
                            src={element.imageUrl as string}
                            style={{ ...style, objectFit: 'contain' }}
                            alt=""
                        />
                    );
                }

                // Text & Regular Placeholders
                const content = element.type === 'text' && element.placeholderKey
                    ? resolvePlaceholder(element.placeholderKey)
                    : (element.content as string) || "";

                // Convert mm to px approx for measurements
                const maxWidthPx = (element.width || 20) * 3.7795275591;
                const maxHeightPx = (element.height || 10) * 3.7795275591;

                return (
                    <div key={element.id} style={style}>
                        <AutoFitText
                            content={content}
                            maxWidth={maxWidthPx - 4} // small margin
                            maxHeight={maxHeightPx - 4}
                            initialFontSize={element.fontSize || 10}
                        />
                    </div>
                );
            })}
        </div>
    );
};
