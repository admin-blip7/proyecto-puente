"use client";

import JsBarcode from 'jsbarcode';
import { LABEL_PLACEHOLDERS, PlaceholderKey } from './labelPlaceholders';
import type { LabelPrintItem, LabelSettings } from '@/types';
import { formatMXNAmount } from '@/lib/validation/currencyValidation';
import { getLogger } from '@/lib/logger';
import { getLabelSettings } from '@/lib/services/settingsService';
import { normalizeVisualEditorData, VisualEditorData, VisualElement } from './visualLayoutTypes';

const log = getLogger('labelPrinter');

const MM_TO_PX = 3.7795275591;

const mmToPx = (mm?: number) => (typeof mm === 'number' ? mm * MM_TO_PX : 0);

const escapeHtml = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface BarcodeJob {
  id: string;
  value: string;
  height: number;
  width: number;
  showValue: boolean;
  fontFamily: string;
  format: 'code128' | 'ean13';
}

interface QRJob {
  id: string;
  value: string;
  size: number;
}

interface RenderContext {
  now: Date;
  dateFormatter: Intl.DateTimeFormat;
  dateTimeFormatter: Intl.DateTimeFormat;
  barcodeJobs: BarcodeJob[];
  qrJobs: QRJob[];
}

const formatPlaceholderValue = (
  key: PlaceholderKey,
  item: LabelPrintItem,
  settings: LabelSettings,
  context: RenderContext
) => {
  switch (key) {
    case 'productName':
      return item.product.name;
    case 'sku':
      return item.product.sku;
    case 'price':
      return item.product.price !== undefined ? formatMXNAmount(item.product.price) : '';
    case 'cost':
      return item.product.cost !== undefined ? formatMXNAmount(item.product.cost) : '';
    case 'stock':
      return item.product.stock !== undefined ? String(item.product.stock) : '';
    case 'ownershipType':
      return item.product.ownershipType ?? '';
    case 'consignorName':
      return item.product.consignorName ?? '';
    case 'supplierName':
      return item.product.supplierName ?? '';
    case 'printDate':
      return context.dateFormatter.format(context.now);
    case 'printDateTime':
      return context.dateTimeFormatter.format(context.now);
    case 'storeName':
      return settings.storeName ?? '';
    case 'barcode':
      return item.product.sku ?? '';
    default:
      return '';
  }
};

const tokenToPlaceholder = new Map(LABEL_PLACEHOLDERS.map((placeholder) => [placeholder.token, placeholder.key]));

const replaceTokensInContent = (
  content: string,
  item: LabelPrintItem,
  settings: LabelSettings,
  context: RenderContext
) => {
  let result = content;
  tokenToPlaceholder.forEach((key, token) => {
    if (result.includes(token)) {
      const replacement = formatPlaceholderValue(key, item, settings, context);
      result = result.split(token).join(replacement);
    }
  });
  return result;
};

const buildElementStyle = (element: VisualElement, settings: LabelSettings) => {
  const fontFamily = element.fontFamily ?? 'Inter';
  const parts: string[] = [
    `left:${(element.x ?? 0).toFixed(2)}mm`,
    `top:${(element.y ?? 0).toFixed(2)}mm`,
    `width:${(element.width ?? settings.width).toFixed(2)}mm`,
    `height:${(element.height ?? settings.height / 4).toFixed(2)}mm`,
    `font-size:${(element.fontSize ?? settings.fontSize).toFixed(0)}px`,
    `display:flex`,
    `align-items:center`,
    `justify-content:${
      element.textAlign === 'left'
        ? 'flex-start'
        : element.textAlign === 'right'
          ? 'flex-end'
          : 'center'
    }`,
    `text-align:${element.textAlign ?? 'center'}`,
    `padding:0`,
    `font-family:${fontFamily}`,
    `font-weight:700`,
    `text-transform:capitalize`,
  ];

  if (element.fontWeight) parts.push(`font-weight:${element.fontWeight}`);
  if (element.color) parts.push(`color:${element.color}`);
  if (element.backgroundColor) parts.push(`background-color:${element.backgroundColor}`);
  if (element.rotation) parts.push(`transform:rotate(${element.rotation}deg)`);

  return parts.join(';');
};

const renderVisualLabel = (
  item: LabelPrintItem,
  layout: VisualElement[],
  settings: LabelSettings,
  context: RenderContext
) => {
  let html = '<div class="label-canvas">';

  layout.forEach((element) => {
    const coercedType = element.type === 'placeholder' ? 'text' : element.type;
    const style = buildElementStyle({ ...element, type: coercedType }, settings);

    if (element.type === 'placeholder') {
      const placeholderKey = element.placeholderKey;
      const definition = LABEL_PLACEHOLDERS.find((placeholder) => placeholder.key === placeholderKey);
      if (definition?.kind === 'barcode') {
        const barcodeValue = formatPlaceholderValue('barcode', item, settings, context);
        if (barcodeValue) {
          const svgId = `barcode-${item.product.sku}-${Math.random().toString(36).slice(2, 8)}`;
          const heightPx = element.height ? Math.max(10, Math.round(mmToPx(element.height))) : settings.barcodeHeight;
          const widthValue = element.width ? Math.max(1, mmToPx(element.width) / 110) : 1.4;
          context.barcodeJobs.push({
            id: svgId,
            value: barcodeValue,
            height: heightPx,
            width: widthValue,
            showValue: element.showValue !== false,
            fontFamily: element.fontFamily ?? 'Inter',
            format: element.barcodeFormat === 'ean13' ? 'ean13' : 'code128',
          });
          html += `<div class="label-element" style="${style}"><svg id="${svgId}"></svg></div>`;
        }
      } else if (placeholderKey) {
        const value = formatPlaceholderValue(placeholderKey, item, settings, context);
        html += `<div class="label-element" style="${style}">${escapeHtml(value)}</div>`;
      }
      return;
    }

    if (coercedType === 'barcode') {
      const barcodeValue = item.product.sku ?? '';
      if (barcodeValue) {
        const svgId = `barcode-static-${item.product.sku}-${Math.random().toString(36).slice(2, 8)}`;
        const heightPx = element.height ? Math.max(10, Math.round(mmToPx(element.height))) : settings.barcodeHeight;
        const widthValue = element.width ? Math.max(1, mmToPx(element.width) / 110) : 1.4;
        context.barcodeJobs.push({
          id: svgId,
          value: barcodeValue,
          height: heightPx,
          width: widthValue,
          showValue: element.showValue !== false,
          fontFamily: element.fontFamily ?? 'Inter',
          format: element.barcodeFormat === 'ean13' ? 'ean13' : 'code128',
        });
        html += `<div class="label-element" style="${style}"><svg id="${svgId}"></svg></div>`;
      }
      return;
    }

    if (coercedType === 'image') {
      const src = (element.imageUrl as string | undefined) || (typeof element.content === 'string' ? element.content : '') || (settings.includeLogo ? settings.logoUrl : '');
      if (src) {
        html += `<div class="label-element" style="${style}"><img src="${escapeHtml(src)}" style="max-width:100%;max-height:100%;object-fit:contain;" /></div>`;
      }
      return;
    }

    if (coercedType === 'qrcode') {
      const key = (element.qrPlaceholderKey as PlaceholderKey | undefined) ?? 'sku';
  const qrValue = formatPlaceholderValue(key, item, settings, context);
  if (qrValue) {
    const canvasId = `qr-${item.product.sku}-${Math.random().toString(36).slice(2, 8)}`;
    const sizePx = element.width ? Math.max(40, Math.round(mmToPx(element.width))) : Math.round(mmToPx(settings.width * 0.25));
    context.qrJobs.push({ id: canvasId, value: qrValue, size: sizePx });
    html += `<div class="label-element" style="${style}"><canvas id="${canvasId}" width="${sizePx}" height="${sizePx}" class="qr-canvas"></canvas></div>`;
    return;
  }
  html += `<div class="label-element" style="${style}"><div class="qr-placeholder">{SKU}</div></div>`;
  return;
}

    const content = element.content ?? '';
    const processed = replaceTokensInContent(content, item, settings, context);
    html += `<div class="label-element" style="${style}">${escapeHtml(processed)}</div>`;
  });

  html += '</div>';
  return html;
};

export const generateAndPrintLabels = async (
  items: LabelPrintItem[],
  fallbackSettings?: LabelSettings
) => {
  let settings: LabelSettings | null = null;

  try {
    settings = await getLabelSettings();
  } catch (error) {
    log.error('No se pudo obtener la configuración de etiquetas más reciente.', error);
    settings = fallbackSettings ?? null;
  }

  if (!settings) {
    alert('No se pudo obtener la configuración de etiquetas.');
    return;
  }

  let visualLayoutData: VisualEditorData | null = null;
  if (settings.visualLayout) {
    try {
      const parsed = JSON.parse(settings.visualLayout);
      visualLayoutData = normalizeVisualEditorData(parsed);
    } catch (error) {
      log.warn('No se pudo interpretar el diseño visual guardado.', error);
    }
  }

  const visualElements = visualLayoutData?.elements ?? [];

  if (visualElements.length === 0) {
    alert('No se encontró un diseño visual de etiquetas guardado. Guarda un diseño en el Diseñador antes de imprimir.');
    return;
  }

  const printWindow = window.open('', 'PRINT', 'height=600,width=800');
  if (!printWindow) {
    alert('El navegador bloqueó la ventana de impresión. Por favor, habilita las ventanas emergentes.');
    return;
  }

  type QRCodeWindow = typeof printWindow & {
    QRCode?: {
      toCanvas: (canvas: HTMLCanvasElement, value: string, options?: { width?: number; margin?: number; errorCorrectionLevel?: string }) => void;
    };
  };

  const qrWindow = printWindow as QRCodeWindow;

  const barcodeJobs: BarcodeJob[] = [];
  const qrJobs: QRJob[] = [];
  const now = new Date();
  const context: RenderContext = {
    now,
    barcodeJobs,
    qrJobs,
    dateFormatter: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    dateTimeFormatter: new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  printWindow.document.write('<html><head><title>Imprimir Etiquetas</title>');
  printWindow.document.write(`
            <style>
                /* Importar fuentes Gilroy */
                @font-face {
                  font-family: 'Gilroy';
                  src: url('/font/Gilroy-Regular.ttf') format('truetype');
                  font-weight: 400;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy';
                  src: url('/font/Gilroy-Medium.ttf') format('truetype');
                  font-weight: 500;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy';
                  src: url('/font/Gilroy-SemiBold.ttf') format('truetype');
                  font-weight: 600;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy';
                  src: url('/font/Gilroy-Bold.ttf') format('truetype');
                  font-weight: 700;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy';
                  src: url('/font/Gilroy-ExtraBold.ttf') format('truetype');
                  font-weight: 800;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy';
                  src: url('/font/Gilroy-Black.ttf') format('truetype');
                  font-weight: 900;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy Light';
                  src: url('/font/Gilroy-Light.ttf') format('truetype');
                  font-weight: 300;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy Thin';
                  src: url('/font/Gilroy-Thin.ttf') format('truetype');
                  font-weight: 100;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy UltraLight';
                  src: url('/font/Gilroy-UltraLight.ttf') format('truetype');
                  font-weight: 200;
                  font-style: normal;
                }
                @font-face {
                  font-family: 'Gilroy Heavy';
                  src: url('/font/Gilroy-Heavy.ttf') format('truetype');
                  font-weight: 950;
                  font-style: normal;
                }
                
                @page {
                    size: ${settings.width}mm ${settings.height}mm;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    font-family: 'Inter', sans-serif;
                }
                .label-canvas {
                    position: relative;
                    width: ${settings.width}mm;
                    height: ${settings.height}mm;
                    box-sizing: border-box;
                    page-break-after: always;
                }
                .label-canvas:last-child {
                    page-break-after: auto;
                }
                .label-element {
                    position: absolute;
                    box-sizing: border-box;
                    overflow: hidden;
                    font-family: inherit;
                    font-weight: inherit;
                    text-transform: inherit;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .qr-placeholder {
                    width: 80%;
                    aspect-ratio: 1 / 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-image: repeating-linear-gradient(45deg, rgba(15,23,42,0.2) 0, rgba(15,23,42,0.2) 6px, transparent 6px, transparent 12px);
                    border-radius: 6px;
                }
                .qr-canvas {
                    width: 100%;
                    height: 100%;
                }
            </style>            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
`);
  printWindow.document.write('</head><body>');

  const expandedItems = items.flatMap((item) => Array.from({ length: Math.max(1, item.quantity) }, () => item));

  expandedItems.forEach((item) => {
    printWindow.document.write(renderVisualLabel(item, visualElements, settings, context));
  });

  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    context.barcodeJobs.forEach((job) => {
      const target = printWindow.document.getElementById(job.id);
      if (!target) return;
      try {
        JsBarcode(target, job.value, {
          format: job.format === 'ean13' ? 'EAN13' : 'CODE128',
          displayValue: job.showValue,
          height: job.height,
          width: job.width,
          margin: 0,
          font: job.fontFamily,
          fontSize: 12,
          textMargin: 4,
        });
      } catch (error) {
        log.error(`Failed to generate barcode for ${job.value}`, error);
      }
    });

    const ensureQrLib = () => new Promise<void>((resolve) => {
      if (qrWindow.QRCode) {
        resolve();
        return;
      }
      const check = setInterval(() => {
        if (qrWindow.QRCode) {
          clearInterval(check);
          resolve();
        }
      }, 20);
      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, 3000);
    });

    ensureQrLib().then(() => {
      context.qrJobs.forEach((job) => {
        const canvas = printWindow.document.getElementById(job.id) as HTMLCanvasElement | null;
        if (!canvas || !qrWindow.QRCode) return;
        try {
          qrWindow.QRCode.toCanvas(canvas, job.value, { width: job.size, margin: 0, errorCorrectionLevel: 'H' });
        } catch (error) {
          log.error(`Failed to generate QR for ${job.value}`, error);
        }
      });

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 100);
    }).catch(() => {
      printWindow.print();
      printWindow.close();
    });
  }, 350);
};
