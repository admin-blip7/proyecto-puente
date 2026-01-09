import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { LabelPrintItem, LabelSettings } from '../../types';
import { normalizeVisualEditorData, VisualEditorData, VisualElement } from './visualLayoutTypes';
import { LABEL_PLACEHOLDERS, PlaceholderKey } from './labelPlaceholders';
import { formatMXNAmount } from '../../lib/validation/currencyValidation';
import { getLogger } from '../../lib/logger';

const log = getLogger('labelPdfGeneratorFixed');

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
    case 'battery':
      return item.product.attributes?.battery ?? '';
    case 'color':
      return item.product.attributes?.color ?? '';
    case 'aesthetic':
      return item.product.attributes?.aesthetic ?? '';
    case 'memory':
      return item.product.attributes?.memory ?? '';
    case 'allAttributes':
      if (item.product.attributes && typeof item.product.attributes === 'object') {
        const entries = Object.entries(item.product.attributes)
          .filter(([_, value]) => value !== null && value !== undefined && value !== '')
          .map(([key, value]) => `${key}: ${value}`);
        return entries.join('\n');
      }
      return '';
    case 'attribute':
      // This is handled by the {attr:...} pattern in replaceTokensInContent
      return '';
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

  result = result.replace(/{attr:(.*?)}/g, (match, attributeName) => {
    const cleanAttributeName = attributeName.trim();
    if (item.product.attributes && typeof item.product.attributes === 'object') {
      const attributeValue = item.product.attributes[cleanAttributeName];
      return attributeValue !== undefined ? String(attributeValue) : '';
    }
    return '';
  });

  return result;
};

const buildElementStyle = (element: VisualElement, settings: LabelSettings) => {
  const fontFamily = element.fontFamily ?? 'Inter';
  const parts: string[] = [
    `left:${(element.x ?? 0).toFixed(2)}mm`,
    `top:${(element.y ?? 0).toFixed(2)}mm`,
    `width:${(element.width ?? settings.width).toFixed(2)}mm`,
    `font-size:${(element.fontSize ?? settings.fontSize).toFixed(0)}px`,
    `display:flex`,
    `align-items:flex-start`,
    `justify-content:${element.textAlign === 'left'
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
    `white-space:pre-wrap`,
    `line-height:1.2`,
    `flex-wrap:wrap`,
    `align-content:flex-start`,
  ];

  if (element.type === 'text') {
    parts.push('height: auto');
  } else {
    parts.push(`height:${(element.height ?? settings.height / 4).toFixed(2)}mm`);
  }

  // Force black color for all elements as requested for legibility
  parts.push(`color:#000000`);
  // if (element.color) {
  //   parts.push(`color:${element.color}`);
  // } else {
  //   parts.push(`color:#000000`);
  // }
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
  let html = '';

  layout.forEach((element) => {
    let coercedType = element.type;
    if (element.type === 'placeholder') {
      const placeholderKey = element.placeholderKey;
      const definition = LABEL_PLACEHOLDERS.find((p) => p.key === placeholderKey);
      if (definition?.kind === 'barcode') {
        coercedType = 'barcode';
      } else {
        coercedType = 'text';
      }
    }

    const style = buildElementStyle({ ...element, type: coercedType }, settings);

    if (element.type === 'placeholder') {
      const placeholderKey = element.placeholderKey;
      const definition = LABEL_PLACEHOLDERS.find((p) => p.key === placeholderKey);
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
        html += `<div class="label-element" style="${style}"><img src="${escapeHtml(src)}" style="max-width:100%;max-height:100%;object-fit:contain;" crossorigin="anonymous" /></div>`;
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

  return html;
};

const getDocumentStyles = (origin: string = '') => `
  <style>
    /* Fuentes seguras primero */
    body { margin: 0; padding: 0; font-family: 'Inter', 'Arial', sans-serif; background: white; }
    .label-canvas { position: relative; box-sizing: border-box; background: white; overflow: hidden; }
    .label-element { position: absolute; box-sizing: border-box; }
    .qr-canvas { width: 100%; height: 100%; }
    .qr-placeholder { width: 80%; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; background-image: repeating-linear-gradient(45deg, rgba(15,23,42,0.2) 0, rgba(15,23,42,0.2) 6px, transparent 6px, transparent 12px); border-radius: 6px; }
    
    /* Fuentes Gilroy con fallback */
    @font-face { font-family: 'Gilroy'; src: local('Gilroy'), url('${origin}/font/Gilroy-Regular.ttf') format('truetype'); font-weight: 400; }
    @font-face { font-family: 'Gilroy'; src: local('Gilroy'), url('${origin}/font/Gilroy-Medium.ttf') format('truetype'); font-weight: 500; }
    @font-face { font-family: 'Gilroy'; src: local('Gilroy'), url('${origin}/font/Gilroy-SemiBold.ttf') format('truetype'); font-weight: 600; }
    @font-face { font-family: 'Gilroy'; src: local('Gilroy'), url('${origin}/font/Gilroy-Bold.ttf') format('truetype'); font-weight: 700; }
    @font-face { font-family: 'Gilroy'; src: local('Gilroy'), url('${origin}/font/Gilroy-ExtraBold.ttf') format('truetype'); font-weight: 800; }
    @font-face { font-family: 'Gilroy'; src: local('Gilroy'), url('${origin}/font/Gilroy-Black.ttf') format('truetype'); font-weight: 900; }
    @font-face { font-family: 'Gilroy Light'; src: local('Gilroy Light'), url('${origin}/font/Gilroy-Light.ttf') format('truetype'); font-weight: 300; }
  </style>
`;

const generateAndInjectScripts = async (container: HTMLElement) => {
  log.info('Generating barcodes and QR codes...');

  // Generate barcodes
  const barcodeElements = container.querySelectorAll('svg[data-barcode-value]');
  log.info(`Found ${barcodeElements.length} barcode elements`);

  for (const svg of barcodeElements) {
    const value = svg.getAttribute('data-barcode-value');
    const height = parseInt(svg.getAttribute('data-barcode-height') || '30');
    const width = parseFloat(svg.getAttribute('data-barcode-width') || '1.4');
    const format = svg.getAttribute('data-barcode-format') || 'CODE128';
    const font = svg.getAttribute('data-barcode-font') || 'Inter';

    if (value) {
      try {
        log.info(`Generating barcode for value: ${value}`);
        (JsBarcode as any)(svg as SVGElement, value, {
          format,
          displayValue: true,
          height,
          width,
          margin: 0,
          font,
          fontSize: Math.max(16, Math.round(height * 0.25)),
          textMargin: Math.max(8, Math.round(height * 0.15)),
          background: '#ffffff',
          lineColor: '#000000',
          textAlign: 'center',
          textPosition: 'bottom',
          fontOptions: 'bold', // Make barcode text bold
          valid: (valid: boolean) => {
            if (!valid) {
              log.warn(`Invalid barcode value: ${value}`);
            }
          }
        });
        log.info('Barcode generated successfully');
      } catch (error) {
        log.error('Error generating barcode:', error);
        svg.innerHTML = `<text style="font-family: monospace; font-size: 10px;" x="0" y="10">${escapeHtml(value)}</text>`;
      }
    }
  }

  // Generate QR codes
  const qrElements = container.querySelectorAll('canvas[data-qr-value]');
  log.info(`Found ${qrElements.length} QR elements`);

  for (const canvas of qrElements) {
    const value = canvas.getAttribute('data-qr-value');
    const size = parseInt(canvas.getAttribute('width') || '50');

    if (value) {
      try {
        log.info(`Generating QR code for value: ${value}`);
        await QRCode.toCanvas(canvas as HTMLCanvasElement, value, {
          width: size,
          margin: 0,
          errorCorrectionLevel: 'H'
        });
        log.info('QR code generated successfully');
      } catch (error) {
        log.error('Error generating QR code:', error);
      }
    }
  }
};

const waitForContentReady = async (container: HTMLElement) => {
  log.info('Waiting for content to be ready...');

  const fontPromise = document.fonts.ready;

  const imagePromises = Array.from(container.getElementsByTagName('img')).map(img => {
    if (img.complete) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      img.onload = () => {
        log.info(`Image loaded: ${img.src}`);
        resolve();
      };
      img.onerror = () => {
        log.error(`Image failed to load: ${img.src}`);
        resolve(); // Resolve anyway to not block PDF generation
      };
    });
  });

  try {
    await Promise.all([fontPromise, ...imagePromises]);
    log.info('Content is ready');
  } catch (error) {
    log.error('Error waiting for content to load:', error);
  }
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

  log.info(`Starting PDF generation for ${items.length} items`);

  let visualLayoutData: VisualEditorData | null = null;
  if (settings.visualLayout) {
    try {
      visualLayoutData = normalizeVisualEditorData(JSON.parse(settings.visualLayout));
      log.info('Visual layout parsed successfully');
    } catch (error) {
      log.warn('Could not parse saved visual layout.', error);
    }
  }
  const visualElements = visualLayoutData?.elements ?? [];
  if (visualElements.length === 0) {
    // throw new Error('No saved visual label layout was found.');
    // Fallback to a default layout if none exists
    const width = settings.width || 50;

    visualElements.push(
      { id: 'def-1', type: 'placeholder', placeholderKey: 'productName', x: 1, y: 2, width: width - 2, height: 5, fontSize: 8, textAlign: 'center', fontWeight: 'bold' },
      { id: 'def-2', type: 'placeholder', placeholderKey: 'price', x: 1, y: 8, width: width - 2, height: 6, fontSize: 12, textAlign: 'center', fontWeight: 'bold' },
      { id: 'def-3', type: 'placeholder', placeholderKey: 'barcode', x: 2, y: 15, width: width - 4, height: 8, fontSize: 10, textAlign: 'center', barcodeFormat: 'code128' },
      { id: 'def-4', type: 'placeholder', placeholderKey: 'sku', x: 1, y: 24, width: width - 2, height: 3, fontSize: 6, textAlign: 'center', fontWeight: 'normal' }
    );
  }

  const now = new Date();
  const context: RenderContext = {
    now,
    dateFormatter: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    dateTimeFormatter: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  };

  const expandedItems = items.flatMap((item, index) =>
    Array.from({ length: Math.max(1, item.quantity) }, (_, quantityIndex) => ({
      ...item,
      _uniqueIndex: index * 1000 + quantityIndex
    }))
  );

  log.info(`Expanded to ${expandedItems.length} labels`);

  const pdf = new jsPDF({
    orientation: settings.width > settings.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [settings.width, settings.height],
  });
  pdf.deletePage(1); // Remove initial blank page

  for (let i = 0; i < expandedItems.length; i++) {
    const item = expandedItems[i];
    log.info(`Processing label ${i + 1}/${expandedItems.length}: ${item.product.name}`);

    const container = document.createElement('div');
    container.id = `label-container-${item._uniqueIndex}`;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = `${settings.width}mm`;
    container.style.height = `${settings.height}mm`;
    container.style.backgroundColor = 'white';

    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'label-canvas';
    canvasWrapper.style.width = `${settings.width}mm`;
    canvasWrapper.style.height = `${settings.height}mm`;

    const labelHtml = createLabelHtml(item, visualElements, settings, context, item._uniqueIndex);

    container.innerHTML = getDocumentStyles(window.location.origin);
    canvasWrapper.innerHTML = labelHtml;
    container.appendChild(canvasWrapper);
    document.body.appendChild(container);

    await generateAndInjectScripts(container);

    await waitForContentReady(container);

    log.info('Capturing canvas with html2canvas...');
    const canvas = await html2canvas(canvasWrapper, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      width: canvasWrapper.offsetWidth,
      height: canvasWrapper.offsetHeight,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    log.info('Canvas captured successfully');

    pdf.addPage([settings.width, settings.height], settings.width > settings.height ? 'landscape' : 'portrait');
    pdf.addImage(imgData, 'PNG', 0, 0, settings.width, settings.height, undefined, 'FAST');

    document.body.removeChild(container);
    log.info(`Label ${i + 1} processed successfully`);
  }

  log.info('PDF generation completed');

  if (returnBlob) {
    return pdf.output('blob');
  } else {
    pdf.save(filename);
  }
};

export const generateLabelsHtml = (
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

  let allLabelsHtml = '';
  expandedItems.forEach((item) => {
    allLabelsHtml += `
      <div class="label-canvas" style="width: ${settings.width}mm; height: ${settings.height}mm; border: 1px solid #ddd; page-break-inside: avoid;">
        ${createLabelHtml(item, visualElements, settings, context, item._uniqueIndex)}
      </div>
    `;
  });

  return `
    <html>
      <head>
        <title>Etiquetas</title>
        ${getDocumentStyles()}
        <style>
          .labels-container { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; padding: 20px; }
          @media print { body { margin: 0; padding: 0; } .labels-container { gap: 0; } .label-canvas { border: none; } }
        </style>
      </head>
      <body>
        <div class="labels-container">${allLabelsHtml}</div>
      </body>
    </html>
  `;
};

export const previewLabelsPdf = async (
  items: LabelPrintItem[],
  settings: LabelSettings,
  maxLabels: number = 6
): Promise<string> => {
  const limitedItems = items.slice(0, maxLabels).map(item => ({
    ...item,
    quantity: Math.min(item.quantity, 2)
  }));

  let visualLayoutData: VisualEditorData | null = null;
  if (settings.visualLayout) {
    try {
      visualLayoutData = normalizeVisualEditorData(JSON.parse(settings.visualLayout));
    } catch (error) {
      console.warn('Could not parse saved visual layout.', error);
    }
  }

  const visualElements = visualLayoutData?.elements ?? [];

  if (visualElements.length === 0) {
    // throw new Error('No saved visual label layout was found.');
    // Fallback to a default layout if none exists
    const width = settings.width || 50;
    const height = settings.height || 25;

    visualElements.push(
      { id: 'def-1', type: 'placeholder', placeholderKey: 'productName', x: 1, y: 2, width: width - 2, height: 5, fontSize: 8, textAlign: 'center', fontWeight: 'bold' },
      { id: 'def-2', type: 'placeholder', placeholderKey: 'price', x: 1, y: 8, width: width - 2, height: 6, fontSize: 12, textAlign: 'center', fontWeight: 'bold' },
      { id: 'def-3', type: 'placeholder', placeholderKey: 'barcode', x: 2, y: 15, width: width - 4, height: 8, fontSize: 10, textAlign: 'center', barcodeFormat: 'code128' },
      { id: 'def-4', type: 'placeholder', placeholderKey: 'sku', x: 1, y: 24, width: width - 2, height: 3, fontSize: 6, textAlign: 'center', fontWeight: 'normal' }
    );
  }

  return generateLabelsHtml(limitedItems, visualElements, settings);
};