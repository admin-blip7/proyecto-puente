export const MM_TO_PX = 3.7795275591;

export const mmToPixels = (mm: number, scale = 1) => mm * MM_TO_PX * scale;

export const pixelsToMm = (px: number, scale = 1) => (px / (MM_TO_PX * scale));

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const roundTo = (value: number, precision = 2) => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

const SAMPLE_PRODUCT_DATA: Record<string, string> = {
  '{Nombre del Producto}': 'Mica Hidrogel Premium',
  '{SKU}': 'ACC-MICA-001',
  '{Precio}': '$150.00',
  '{Descripción}': 'Protector de pantalla alta resistencia',
  '{Nombre de la Tienda}': 'Mi Tienda',
  '{Nombre del Cliente}': 'Cliente General',
  '{Dirección del Cliente}': 'Conocido',
  '{ID de Orden}': 'ORD-2023-001',
  '{Fecha de Impresión}': '23/01/2026',
  '{Código de Barras}': '123456789012',
  '{Código QR}': 'https://ejemplo.com',
  '{Imagen}': '',
};

const SAMPLE_REPAIR_DATA: Record<string, string> = {
  ...SAMPLE_PRODUCT_DATA, // Fallback
  '{ID de Orden}': 'REP-8852',
  '{Nombre del Cliente}': 'Juan Pérez',
  '{Teléfono}': '555-0123',
  '{Marca del Dispositivo}': 'Apple',
  '{Modelo del Dispositivo}': 'iPhone 13 Pro',
  '{Serial/IMEI}': '354829103847291',
  '{NIP/Contraseña}': '123456',
  '{Estado de Reparación}': 'En Diagnóstico',
  '{Costo de Reparación}': '$1,200.00',
  '{Costo Total}': '$1,200.00',
  '{Problema Reportado}': 'Pantalla rota, no da imagen',
  '{Notas del Técnico}': 'Revisar sensor de proximidad',
};

export const replacePlaceholdersWithSampleData = (text: string, labelType: 'product' | 'repair' = 'product'): string => {
  if (!text) return text;

  const sampleData = labelType === 'repair' ? SAMPLE_REPAIR_DATA : SAMPLE_PRODUCT_DATA;

  return text.replace(/\{[^}]+\}/g, (match) => {
    // Exact match lookup
    if (sampleData[match]) {
      return sampleData[match];
    }
    // Partial flexible match if needed (optional)
    return match;
  });
};
