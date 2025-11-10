import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
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

const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string') return false;

  // Reject data URLs larger than 100KB to prevent performance issues
  if (url.startsWith('data:image/')) {
    const base64Size = url.length * 0.75; // Approximate decoded size
    return base64Size <= 100 * 1024; // 100KB limit
  }

  // Allow http, https, and relative URLs
  return url.startsWith('http://') ||
         url.startsWith('https://') ||
         (!url.startsWith('data:') && !url.startsWith('blob:'));
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
    // Force text color to black unless explicitly specified
    `color:${element.color ?? '#000000'}`,
  ];

  if (element.type === 'text') {
    parts.push('height: auto');
  } else {
    parts.push(`height:${(element.height ?? settings.height / 4).toFixed(2)}mm`);
  }

  // Only set background color if explicitly provided
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
      if (src && isValidImageUrl(src)) {
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
  // Generate barcodes
  const barcodeElements = container.querySelectorAll('svg[data-barcode-value]');
  for (const svg of barcodeElements) {
    const value = svg.getAttribute('data-barcode-value');
    let height = parseInt(svg.getAttribute('data-barcode-height') || '30');
    const width = parseFloat(svg.getAttribute('data-barcode-width') || '1.4');
    const format = svg.getAttribute('data-barcode-format') || 'CODE128';
    const font = svg.getAttribute('data-barcode-font') || 'Inter';

    if (value) {
      try {
        // Calculate adequate space for barcode numbers
        // Text typically needs 20-25% of barcode height
        const calculatedTextSize = Math.max(18, Math.round(height * 0.25));
        const calculatedTextMargin = Math.max(12, Math.round(height * 0.30));

        // Adjust height to ensure full visibility of numbers
        // Total height = barcode bars + text area
        const totalBarcodeHeight = height + calculatedTextMargin + (calculatedTextSize * 0.6);
        height = Math.max(height, Math.round(totalBarcodeHeight));

        // Set explicit dimensions on SVG to ensure proper rendering
        const svgElement = svg as SVGElement;
        const currentViewBox = svgElement.getAttribute('viewBox');
        if (currentViewBox) {
          const [, , vbWidth, vbHeight] = currentViewBox.split(' ').map(Number);
          if (vbHeight < height) {
            svgElement.setAttribute('viewBox', `0 0 ${vbWidth} ${height}`);
            svgElement.setAttribute('height', height.toString());
          }
        }

        // Use the imported JsBarcode directly with improved settings
        (JsBarcode as any)(svgElement, value, {
          format,
          displayValue: true,
          height,
          width,
          margin: 0,
          font,
          fontSize: calculatedTextSize,
          textMargin: calculatedTextMargin,
          background: '#ffffff',
          lineColor: '#000000',
          textAlign: 'center',
          textPosition: 'bottom',
        });

        // Post-process: ensure the SVG has proper padding for text
        try {
          const bbox = (svgElement as any).getBBox();
          const requiredHeight = bbox.y + bbox.height + calculatedTextMargin;
          if (requiredHeight > height) {
            svgElement.setAttribute('height', Math.ceil(requiredHeight).toString());
          }
        } catch (e) {
          // Fallback if getBBox is not available
          console.warn('Could not get bounding box for SVG, using calculated height');
        }
      } catch (error) {
        console.error('Error generating barcode:', error);
        svg.innerHTML = `<text style="font-family: monospace; font-size: 10px; fill: #000000;">${escapeHtml(value)}</text>`;
      }
    }
  }

  // Generate QR codes
  const qrElements = container.querySelectorAll('canvas[data-qr-value]');
  for (const canvas of qrElements) {
    const value = canvas.getAttribute('data-qr-value');
    const size = parseInt(canvas.getAttribute('width') || '50');

    if (value) {
      try {
        // Use the imported QRCode directly
        await QRCode.toCanvas(canvas as HTMLCanvasElement, value, {
          width: size,
          margin: 0,
          errorCorrectionLevel: 'H'
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  }
};

const waitForContentReady = async (container: HTMLElement) => {
  const fontPromise = document.fonts.ready;

  const imagePromises = Array.from(container.getElementsByTagName('img')).map(img => {
    if (img.complete) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => {
        console.error(`Image failed to load: ${img.src}`);
        resolve(); // Resolve anyway to not block PDF generation
      };
    });
  });

  try {
    await Promise.all([fontPromise, ...imagePromises]);
  } catch (error) {
    console.error('Error waiting for content to load:', error);
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
    throw new Error('No saved visual label layout was found.');
  }

  const now = new Date();
  const context: RenderContext = {
    now,
    dateFormatter: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    dateTimeFormatter: new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}),
  };

  const expandedItems = items.flatMap((item, index) =>
    Array.from({ length: Math.max(1, item.quantity) }, (_, quantityIndex) => ({
      ...item,
      _uniqueIndex: index * 1000 + quantityIndex
    }))
  );

  const pdf = new jsPDF({
    orientation: settings.width > settings.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [settings.width, settings.height],
  });
  pdf.deletePage(1); // Remove initial blank page

  for (let i = 0; i < expandedItems.length; i++) {
    const item = expandedItems[i];

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

    pdf.addPage([settings.width, settings.height], settings.width > settings.height ? 'landscape' : 'portrait');
    pdf.addImage(imgData, 'PNG', 0, 0, settings.width, settings.height, undefined, 'FAST');

    document.body.removeChild(container);
  }

  if (returnBlob) {
    return pdf.output('blob');
  } else {
    pdf.save(filename);
  }
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
    throw new Error('No saved visual label layout was found.');
  }

  return generateLabelsHtml(limitedItems, visualElements, settings);
};