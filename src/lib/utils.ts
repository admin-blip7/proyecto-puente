import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { RepairStatus, Warranty, LabelSettings } from "./types"
import JsBarcode from 'jsbarcode';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getWarrantyStatusVariant = (status: Warranty['status']) => {
    switch (status) {
      case 'Pendiente':
        return 'default';
      case 'En Revisión':
        return 'secondary';
      case 'Resuelta':
        return 'outline';
      case 'Rechazada':
        return 'destructive';
      default:
        return 'default';
    }
};

export const getStatusVariant = (status: RepairStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Recibido':
        return 'default';
      case 'En Diagnóstico':
      case 'En Reparación':
      case 'Esperando Refacción':
        return 'secondary';
      case 'Listo para Entrega':
        return 'outline';
      case 'Completado':
        return 'default'; // Or a success variant if you add one
      case 'Cancelado':
        return 'destructive';
      default:
        return 'default';
    }
};


export const generateAndPrintLabels = (
    items: { name: string; sku: string; price: number; quantity: number }[],
    settings: LabelSettings
) => {
    const printWindow = window.open('', 'PRINT', 'height=600,width=800');
    if (!printWindow) {
        alert("El navegador bloqueó la ventana de impresión. Por favor, habilita las ventanas emergentes.");
        return;
    }

    printWindow.document.write('<html><head><title>Imprimir Etiquetas</title>');
    printWindow.document.write(`
        <style>
            @page { 
                size: ${settings.width}mm ${settings.height}mm;
                margin: 0;
            }
            body { 
                margin: 0; 
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .label {
                width: ${settings.width}mm;
                height: ${settings.height}mm;
                box-sizing: border-box;
                padding: 2mm;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                overflow: hidden;
                page-break-after: always;
                font-size: ${settings.fontSize}px;
                line-height: 1.2;
            }
            .label:last-child {
                page-break-after: auto;
            }
            .product-name {
                font-weight: bold;
            }
            .barcode {
                width: 90%;
                margin: 4px 0;
            }
            .price {
                font-weight: bold;
                font-size: ${settings.fontSize + 2}px;
            }
            .sku-text {
                font-family: 'Courier New', Courier, monospace;
                letter-spacing: 1px;
                font-size: ${settings.fontSize - 1}px;
            }
            .logo {
                max-width: 50%;
                max-height: 20px;
                object-fit: contain;
                margin-bottom: 2px;
            }
        </style>
    `);
    printWindow.document.write('</head><body>');
    
    const expandedItems = items.flatMap(item => Array(item.quantity).fill(item));

    expandedItems.forEach(item => {
        printWindow.document.write('<div class="label">');
        
        if (settings.includeLogo && settings.logoUrl) {
            printWindow.document.write(`<img src="${settings.logoUrl}" class="logo" />`);
        }
        if (settings.content.showStoreName && settings.storeName) {
            printWindow.document.write(`<div>${settings.storeName}</div>`);
        }
        if (settings.content.showProductName) {
            printWindow.document.write(`<div class="product-name">${item.name}</div>`);
        }

        const barcodeId = `barcode-${item.sku}-${Math.random().toString(36).substring(2)}`;
        printWindow.document.write(`<svg id="${barcodeId}" class="barcode"></svg>`);
        
        if (settings.content.showSku) {
            printWindow.document.write(`<div class="sku-text">${item.sku}</div>`);
        }
        if (settings.content.showPrice) {
            printWindow.document.write(`<div class="price">$${item.price.toFixed(2)}</div>`);
        }

        printWindow.document.write('</div>');

        try {
            JsBarcode(printWindow.document.getElementById(barcodeId), item.sku, {
                format: 'CODE128',
                displayValue: false,
                height: settings.barcodeHeight,
                width: 1.5,
                margin: 0,
            });
        } catch (e) {
            console.error(`Failed to generate barcode for ${item.sku}`, e);
        }
    });

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
};
