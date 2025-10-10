export type PlaceholderKind = 'text' | 'barcode';

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
  | 'printDate'
  | 'printDateTime'
  | 'storeName'
  // Repair placeholders
  | 'orderId'
  | 'customerName'
  | 'deviceBrand'
  | 'deviceModel'
  | 'deviceSerial'
  | 'status'
  | 'repairCost'
  | 'totalCost'
  | 'reportedIssue'
  | 'technicianNotes';

export interface PlaceholderDefinition {
  key: PlaceholderKey;
  label: string;
  token: string;
  kind: PlaceholderKind;
  helperText?: string;
}

export const LABEL_PLACEHOLDERS: PlaceholderDefinition[] = [
  // Product placeholders
  { key: 'productName', label: 'Nombre del Producto', token: '{Nombre del Producto}', kind: 'text' },
  { key: 'sku', label: 'SKU', token: '{SKU}', kind: 'text' },
  { key: 'barcode', label: 'Código de Barras', token: '{Código de Barras}', kind: 'barcode', helperText: 'Usa el SKU del producto.' },
  { key: 'price', label: 'Precio de Venta', token: '{Precio de Venta}', kind: 'text' },
  { key: 'cost', label: 'Costo', token: '{Costo}', kind: 'text' },
  { key: 'stock', label: 'Stock Actual', token: '{Stock Actual}', kind: 'text' },
  { key: 'ownershipType', label: 'Tipo de Propiedad', token: '{Tipo de Propiedad}', kind: 'text' },
  { key: 'consignorName', label: 'Nombre del Consignador', token: '{Nombre del Consignador}', kind: 'text' },
  { key: 'supplierName', label: 'Nombre del Proveedor', token: '{Nombre del Proveedor}', kind: 'text' },
  
  // Repair placeholders
  { key: 'orderId', label: 'ID de Orden', token: '{ID de Orden}', kind: 'text' },
  { key: 'customerName', label: 'Nombre del Cliente', token: '{Nombre del Cliente}', kind: 'text' },
  { key: 'deviceBrand', label: 'Marca del Dispositivo', token: '{Marca del Dispositivo}', kind: 'text' },
  { key: 'deviceModel', label: 'Modelo del Dispositivo', token: '{Modelo del Dispositivo}', kind: 'text' },
  { key: 'deviceSerial', label: 'Serial/IMEI', token: '{Serial/IMEI}', kind: 'text' },
  { key: 'status', label: 'Estado de Reparación', token: '{Estado de Reparación}', kind: 'text' },
  { key: 'repairCost', label: 'Costo de Reparación', token: '{Costo de Reparación}', kind: 'text' },
  { key: 'totalCost', label: 'Costo Total', token: '{Costo Total}', kind: 'text' },
  { key: 'reportedIssue', label: 'Problema Reportado', token: '{Problema Reportado}', kind: 'text' },
  { key: 'technicianNotes', label: 'Notas del Técnico', token: '{Notas del Técnico}', kind: 'text' },
  
  // General placeholders
  { key: 'printDate', label: 'Fecha de Impresión (DD/MM/AAAA)', token: '{Fecha de Impresión (DD/MM/AAAA)}', kind: 'text' },
  { key: 'printDateTime', label: 'Fecha y Hora de Impresión', token: '{Fecha y Hora de Impresión}', kind: 'text' },
  { key: 'storeName', label: 'Nombre de la Tienda', token: '{Nombre de la Tienda}', kind: 'text' },
];
