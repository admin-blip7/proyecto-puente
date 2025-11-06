"use client";

import * as JsBarcode from 'jsbarcode';
import { LABEL_PLACEHOLDERS, PlaceholderKey } from './labelPlaceholders';
import type { LabelPrintItem, LabelSettings } from '../../types';
import { formatMXNAmount } from '../../lib/validation/currencyValidation';
import { getLogger } from '../../lib/logger';
import { getLabelSettings } from '../../lib/services/settingsService';
import { normalizeVisualEditorData, VisualEditorData, VisualElement } from './visualLayoutTypes';
import { generateLabelPdf } from './labelPdfGenerator';

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
    case 'category':
      return item.product.category ?? '';
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

  // Handle standard placeholders
  tokenToPlaceholder.forEach((key, token) => {
    if (result.includes(token)) {
      const replacement = formatPlaceholderValue(key, item, settings, context);
      result = result.split(token).join(replacement);
    }
  });

  // Handle dynamic attributes like {attr:color}
  result = result.replace(/{attr:(.*?)}/g, (match, attributeName) => {
    const cleanAttributeName = attributeName.trim();
    if (item.product.attributes && typeof item.product.attributes === 'object') {
      const attributeValue = item.product.attributes[cleanAttributeName];
      return attributeValue !== undefined ? String(attributeValue) : '';
    }
    return ''; // Return empty if attributes are not available
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
    `align-items:flex-start`,
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
    `word-wrap:break-word`,
    `overflow-wrap:break-word`,
    `white-space:normal`,
    `line-height:1.2`,
    `flex-wrap:wrap`,
    `align-content:flex-start`,
  ];

  if (element.fontWeight) parts.push(`font-weight:${element.fontWeight}`);
  if (element.color) parts.push(`color:${element.color}`);
  if (element.backgroundColor) parts.push(`background-color:${element.backgroundColor}`);
  if (element.rotation) {
    parts.push(`transform:rotate(${element.rotation}deg)`);
    parts.push(`transform-origin:center center`);
  }

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

  try {
    // Generate PDF and open in new window for printing
    const pdfBlob = await generateLabelPdf(items, settings, { returnBlob: true }) as Blob;
    
    // Create object URL and open in new window for printing
    const url = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        // Clean up after printing
        setTimeout(() => {
          printWindow.close();
          URL.revokeObjectURL(url);
        }, 100);
      };
    } else {
      // If popup is blocked, fallback to download
      const filename = `etiquetas-${new Date().toISOString().split('T')[0]}.pdf`;
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      alert('La ventana de impresión fue bloqueada. El PDF se ha descargado automáticamente.');
    }
  } catch (error) {
    log.error('Error al generar PDF de etiquetas:', error);
    alert(`Error al generar PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};
