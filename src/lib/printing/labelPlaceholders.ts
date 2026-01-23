export type PlaceholderKind = 'text' | 'barcode' | 'image';

export type PlaceholderKey =
  | 'productName'
  | 'sku'
  | 'barcode'
  | 'price'
  | 'cost'
  | 'stock'
  | 'ownershipType'
  | 'consignorName'
  | 'supplierName'
  | 'category'
  | 'attribute'
  | 'battery'
  | 'color'
  | 'aesthetic'
  | 'memory'
  | 'allAttributes'
  | 'printDate'
  | 'printDateTime'
  | 'storeName'
  // Repair placeholders
  | 'orderId'
  | 'customerName'
  | 'customerPhone'
  | 'deviceBrand'
  | 'deviceModel'
  | 'deviceSerial'
  | 'devicePassword'
  | 'status'
  | 'repairCost'
  | 'totalCost'
  | 'reportedIssue'
  | 'technicianNotes'
  | 'patternGrid';

export type PlaceholderScope = 'product' | 'repair' | 'both';

export interface PlaceholderDefinition {
  key: PlaceholderKey;
  label: string;
  token: string;
  kind: PlaceholderKind;
  helperText?: string;
  scope: PlaceholderScope;
}

export const LABEL_PLACEHOLDERS: PlaceholderDefinition[] = [
  // Product placeholders
  { key: 'productName', label: 'Nombre del Producto', token: '{Nombre del Producto}', kind: 'text', scope: 'product' },
  { key: 'sku', label: 'SKU', token: '{SKU}', kind: 'text', scope: 'product' },
  { key: 'barcode', label: 'Código de Barras', token: '{Código de Barras}', kind: 'barcode', helperText: 'Usa el SKU del producto.', scope: 'product' },
  { key: 'price', label: 'Precio de Venta', token: '{Precio de Venta}', kind: 'text', scope: 'product' },
  { key: 'cost', label: 'Costo', token: '{Costo}', kind: 'text', scope: 'product' },
  { key: 'stock', label: 'Stock Actual', token: '{Stock Actual}', kind: 'text', scope: 'product' },
  { key: 'ownershipType', label: 'Tipo de Propiedad', token: '{Tipo de Propiedad}', kind: 'text', scope: 'product' },
  { key: 'consignorName', label: 'Nombre del Consignador', token: '{Nombre del Consignador}', kind: 'text', scope: 'product' },
  { key: 'supplierName', label: 'Nombre del Proveedor', token: '{Nombre del Proveedor}', kind: 'text', scope: 'product' },
  { key: 'category', label: 'Categoría', token: '{Categoría}', kind: 'text', scope: 'product' },
  { key: 'attribute', label: 'Atributo Específico', token: '{attr:nombre_del_atributo}', kind: 'text', helperText: 'Reemplaza "nombre_del_atributo" con el nombre del atributo que deseas mostrar. Por ejemplo: {attr:memoria} o {attr:color}.', scope: 'product' },
  { key: 'battery', label: 'Batería', token: '{Batería}', kind: 'text', scope: 'product' },
  { key: 'color', label: 'Color', token: '{Color}', kind: 'text', scope: 'product' },
  { key: 'aesthetic', label: 'Estética', token: '{Estética}', kind: 'text', scope: 'product' },
  { key: 'memory', label: 'Memoria', token: '{Memoria}', kind: 'text', scope: 'product' },
  { key: 'allAttributes', label: 'Todos los Atributos', token: '{Todos los Atributos}', kind: 'text', helperText: 'Muestra todos los atributos del producto (batería, color, estética, memoria, etc.) en un formato legible.', scope: 'product' },

  // Repair placeholders
  { key: 'orderId', label: 'ID de Orden', token: '{ID de Orden}', kind: 'text', scope: 'repair' },
  { key: 'customerName', label: 'Nombre del Cliente', token: '{Nombre del Cliente}', kind: 'text', scope: 'repair' },
  { key: 'customerPhone', label: 'Teléfono del Cliente', token: '{Teléfono}', kind: 'text', scope: 'repair' },
  { key: 'deviceBrand', label: 'Marca del Dispositivo', token: '{Marca del Dispositivo}', kind: 'text', scope: 'repair' },
  { key: 'deviceModel', label: 'Modelo del Dispositivo', token: '{Modelo del Dispositivo}', kind: 'text', scope: 'repair' },
  { key: 'deviceSerial', label: 'Serial/IMEI', token: '{Serial/IMEI}', kind: 'text', scope: 'repair' },
  { key: 'devicePassword', label: 'NIP/Contraseña Dispositivo', token: '{NIP/Contraseña}', kind: 'text', scope: 'repair' },
  { key: 'status', label: 'Estado de Reparación', token: '{Estado de Reparación}', kind: 'text', scope: 'repair' },
  { key: 'repairCost', label: 'Costo de Reparación', token: '{Costo de Reparación}', kind: 'text', scope: 'repair' },
  { key: 'totalCost', label: 'Costo Total', token: '{Costo Total}', kind: 'text', scope: 'repair' },
  { key: 'reportedIssue', label: 'Problema Reportado', token: '{Problema Reportado}', kind: 'text', scope: 'repair' },
  { key: 'technicianNotes', label: 'Notas del Técnico', token: '{Notas del Técnico}', kind: 'text', scope: 'repair' },
  { key: 'patternGrid', label: 'Cuadrícula de Patrón', token: '{Cuadrícula de Patrón}', kind: 'image', scope: 'repair' },

  // General placeholders
  { key: 'printDate', label: 'Fecha de Impresión (DD/MM/AAAA)', token: '{Fecha de Impresión (DD/MM/AAAA)}', kind: 'text', scope: 'both' },
  { key: 'printDateTime', label: 'Fecha y Hora de Impresión', token: '{Fecha y Hora de Impresión}', kind: 'text', scope: 'both' },
  { key: 'storeName', label: 'Nombre de la Tienda', token: '{Nombre de la Tienda}', kind: 'text', scope: 'both' },
];
