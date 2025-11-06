import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LabelPrintItem, LabelSettings } from '../../types';
import { normalizeVisualEditorData, VisualEditorData, VisualElement } from './visualLayoutTypes';
import { LABEL_PLACEHOLDERS, PlaceholderKey } from './labelPlaceholders';
import { formatMXNAmount } from '../../lib/validation/currencyValidation';
import { getLogger } from '../../lib/logger';

const log = getLogger('labelPdfGenerator');

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

interface RenderContext {
  now: Date;
  dateFormatter: Intl.DateTimeFormat;
  dateTimeFormatter: Intl.DateTimeFormat;
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
    `font-weight:${element.fontWeight ?? 700}`,
    `text-transform:capitalize`,
    `word-wrap:break-word`,
    `overflow-wrap:break-word`,
    `white-space:normal`,
    `line-height:1.2`,
    `flex-wrap:wrap`,
    `align-content:flex-start`,
  ];

  if (element.color) parts.push(`color:${element.color}`);
  if (element.backgroundColor) parts.push(`background-color:${element.backgroundColor}`);
  if (element.rotation) {
    parts.push(`transform:rotate(${element.rotation}deg)`);
    parts.push(`transform-origin:center center`);
  }

  return parts.join(';');
};

const createLabelHtml = (
  item: LabelPrintItem,
  layout: VisualElement[],
  settings: LabelSettings,
  context: RenderContext,
  index: number
): string => {
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
          const svgId = `barcode-${index}-${item.product.sku}-${element.id}`;
          const heightPx = element.height ? Math.max(10, Math.round(mmToPx(element.height))) : settings.barcodeHeight;
          const widthValue = element.width ? Math.max(1, mmToPx(element.width) / 110) : 1.4;
          html += `<div class="label-element" style="${style}"><svg id="${svgId}" data-barcode-value="${barcodeValue}" data-barcode-height="${heightPx}" data-barcode-width="${widthValue}" data-barcode-format="${element.barcodeFormat === 'ean13' ? 'EAN13' : 'CODE128'}" data-barcode-font="${element.fontFamily ?? 'Inter'}"></svg></div>`;
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
        const svgId = `barcode-static-${index}-${item.product.sku}-${element.id}`;
        const heightPx = element.height ? Math.max(10, Math.round(mmToPx(element.height))) : settings.barcodeHeight;
        const widthValue = element.width ? Math.max(1, mmToPx(element.width) / 110) : 1.4;
        html += `<div class="label-element" style="${style}"><svg id="${svgId}" data-barcode-value="${barcodeValue}" data-barcode-height="${heightPx}" data-barcode-width="${widthValue}" data-barcode-format="${element.barcodeFormat === 'ean13' ? 'EAN13' : 'CODE128'}" data-barcode-font="${element.fontFamily ?? 'Inter'}"></svg></div>`;
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
        const canvasId = `qr-${index}-${item.product.sku}-${element.id}`;
        const sizePx = element.width ? Math.max(40, Math.round(mmToPx(element.width))) : Math.round(mmToPx(settings.width * 0.25));
        html += `<div class="label-element" style="${style}"><canvas id="${canvasId}" width="${sizePx}" height="${sizePx}" class="qr-canvas" data-qr-value="${qrValue}"></canvas></div>`;
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

const generateLabelsHtml = (
  items: LabelPrintItem[],
  visualElements: VisualElement[],
  settings: LabelSettings
): string => {
  const now = new Date();
  const context: RenderContext = {
    now,
    dateFormatter: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    dateTimeFormatter: new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  const expandedItems = items.flatMap((item, index) => 
    Array.from({ length: Math.max(1, item.quantity) }, (_, quantityIndex) => ({
      ...item,
      _uniqueIndex: index * 1000 + quantityIndex
    }))
  );

  let html = `
    <html>
      <head>
        <title>Etiquetas PDF</title>
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
          
          body {
            margin: 0;
            padding: 20px;
            font-family: 'Inter', sans-serif;
            background: white;
          }
          .labels-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: flex-start;
          }
          .label-canvas {
            position: relative;
            width: ${settings.width}mm;
            height: ${settings.height}mm;
            box-sizing: border-box;
            background: white;
            border: 1px solid #ddd;
            page-break-inside: avoid;
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
          @media print {
            body { margin: 0; padding: 0; }
            .labels-container { gap: 0; }
            .label-canvas { border: none; }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
      </head>
      <body>
        <div class="labels-container">
  `;

  expandedItems.forEach((item, index) => {
    html += createLabelHtml(item, visualElements, settings, context, item._uniqueIndex);
  });

  html += `
        </div>
        <script>
          // Generate barcodes
          document.querySelectorAll('svg[data-barcode-value]').forEach(svg => {
            const value = svg.getAttribute('data-barcode-value');
            const height = parseInt(svg.getAttribute('data-barcode-height'));
            const width = parseFloat(svg.getAttribute('data-barcode-width'));
            const format = svg.getAttribute('data-barcode-format');
            const font = svg.getAttribute('data-barcode-font');
            
            if (value && window.JsBarcode) {
              try {
                JsBarcode(svg, value, {
                  format: format,
                  displayValue: true,
                  height: height,
                  width: width,
                  margin: 0,
                  font: font,
                  fontSize: Math.max(16, Math.round(height * 0.25)),
                  textMargin: Math.max(8, Math.round(height * 0.15)),
                  background: '#ffffff',
                  lineColor: '#000000',
                  textAlign: 'center',
                  textPosition: 'bottom',
                });
              } catch (error) {
                console.error('Error generating barcode:', error);
                svg.innerHTML = '<text style="font-family: monospace; font-size: 10px;">' + value + '</text>';
              }
            }
          });
          
          // Generate QR codes
          document.querySelectorAll('canvas[data-qr-value]').forEach(canvas => {
            const value = canvas.getAttribute('data-qr-value');
            const size = parseInt(canvas.getAttribute('width'));
            
            if (value && window.QRCode) {
              try {
                window.QRCode.toCanvas(canvas, value, { 
                  width: size, 
                  margin: 0, 
                  errorCorrectionLevel: 'H' 
                });
              } catch (error) {
                console.error('Error generating QR code:', error);
              }
            }
          });
        </script>
      </body>
    </html>
  `;

  return html;
};

const createSingleLabelHtml = (
  item: LabelPrintItem & { _uniqueIndex: number },
  layout: VisualElement[],
  settings: LabelSettings,
  context: RenderContext,
  index: number
): string => {
  let html = `
    <html>
      <head>
        <title>Etiqueta</title>
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
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            width: ${settings.width}mm;
            height: ${settings.height}mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: white;
          }
          
          .label-canvas {
            position: relative;
            width: ${settings.width}mm;
            height: ${settings.height}mm;
            background: white;
            overflow: hidden;
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
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
      </head>
      <body>
  `;

  html += createLabelHtml(item, layout, settings, context, index);

  html += `
        <script>
          // Generate barcodes
          document.querySelectorAll('svg[data-barcode-value]').forEach(svg => {
            const value = svg.getAttribute('data-barcode-value');
            const height = parseInt(svg.getAttribute('data-barcode-height'));
            const width = parseFloat(svg.getAttribute('data-barcode-width'));
            const format = svg.getAttribute('data-barcode-format');
            const font = svg.getAttribute('data-barcode-font');
            
            if (value && window.JsBarcode) {
              try {
                JsBarcode(svg, value, {
                  format: format,
                  displayValue: true,
                  height: height,
                  width: width,
                  margin: 0,
                  font: font,
                  fontSize: Math.max(16, Math.round(height * 0.25)),
                  textMargin: Math.max(8, Math.round(height * 0.15)),
                  background: '#ffffff',
                  lineColor: '#000000',
                  textAlign: 'center',
                  textPosition: 'bottom',
                });
              } catch (error) {
                console.error('Error generating barcode:', error);
                svg.innerHTML = '<text style="font-family: monospace; font-size: 10px;">' + value + '</text>';
              }
            }
          });
          
          // Generate QR codes
          document.querySelectorAll('canvas[data-qr-value]').forEach(canvas => {
            const value = canvas.getAttribute('data-qr-value');
            const size = parseInt(canvas.getAttribute('width'));
            
            if (value && window.QRCode) {
              try {
                window.QRCode.toCanvas(canvas, value, { 
                  width: size, 
                  margin: 0, 
                  errorCorrectionLevel: 'H',
                  color: {
                    dark: '#000000',
                    light: '#ffffff'
                  }
                });
              } catch (error) {
                console.error('Error generating QR code:', error);
              }
            }
          });
        </script>
      </body>
    </html>
  `;

  return html;
};

export const generateLabelPdf = async (
  items: LabelPrintItem[],
  settings: LabelSettings,
  options?: {
    filename?: string;
    returnBlob?: boolean;
  }
): Promise<void | Blob> => {
  const filename = options?.filename || `etiquetas-${new Date().toISOString().split('T')[0]}.pdf`;
  const returnBlob = options?.returnBlob || false;

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
    throw new Error('No se encontró un diseño visual de etiquetas guardado.');
  }

  // Expand items according to quantity
  const now = new Date();
  const context: RenderContext = {
    now,
    dateFormatter: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    dateTimeFormatter: new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  const expandedItems = items.flatMap((item, index) => 
    Array.from({ length: Math.max(1, item.quantity) }, (_, quantityIndex) => ({
      ...item,
      _uniqueIndex: index * 1000 + quantityIndex
    }))
  );

  // Create PDF with exact label dimensions
  const pdf = new jsPDF({
    orientation: settings.width > settings.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [settings.width, settings.height],
  });

  // Create a temporary container to render each label
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = `${settings.width}mm`;
  container.style.height = `${settings.height}mm`;
  container.style.background = 'white';
  document.body.appendChild(container);

  try {
    // Load external scripts once
    const scriptsHtml = `
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
    `;
    container.innerHTML = scriptsHtml;
    await new Promise(resolve => setTimeout(resolve, 500));

    // Process each label individually
    for (let i = 0; i < expandedItems.length; i++) {
      const item = expandedItems[i];
      
      // Generate HTML for this single label
      const labelHtml = createSingleLabelHtml(item, visualElements, settings, context, item._uniqueIndex);
      container.innerHTML = labelHtml;

      // Wait for barcodes and QR codes to be generated
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate canvas from this label with exact dimensions
      const canvas = await html2canvas(container, {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: mmToPx(settings.width),
        height: mmToPx(settings.height),
        windowWidth: mmToPx(settings.width),
        windowHeight: mmToPx(settings.height),
      });

      // Convert to image
      const imgData = canvas.toDataURL('image/png', 1.0);

      // Add new page for each label after the first
      if (i > 0) {
        pdf.addPage([settings.width, settings.height], settings.width > settings.height ? 'landscape' : 'portrait');
      }

      // Add image to PDF with exact dimensions
      pdf.addImage(imgData, 'PNG', 0, 0, settings.width, settings.height, undefined, 'FAST');
    }

    if (returnBlob) {
      return pdf.output('blob');
    } else {
      pdf.save(filename);
    }
  } finally {
    document.body.removeChild(container);
  }
};

export const previewLabelsPdf = async (
  items: LabelPrintItem[],
  settings: LabelSettings,
  maxLabels: number = 6
): Promise<string> => {
  // Limit items for preview
  const limitedItems = items.slice(0, maxLabels).map(item => ({
    ...item,
    quantity: Math.min(item.quantity, 2) // Max 2 of each for preview
  }));

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
    throw new Error('No se encontró un diseño visual de etiquetas guardado.');
  }

  return generateLabelsHtml(limitedItems, visualElements, settings);
};