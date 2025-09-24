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
  | 'storeName';

export interface PlaceholderDefinition {
  key: PlaceholderKey;
  label: string;
  token: string;
  kind: PlaceholderKind;
  helperText?: string;
}

export const LABEL_PLACEHOLDERS: PlaceholderDefinition[] = [
  { key: 'productName', label: 'Nombre del Producto', token: '{Nombre del Producto}', kind: 'text' },
  { key: 'sku', label: 'SKU', token: '{SKU}', kind: 'text' },
  { key: 'barcode', label: 'Código de Barras', token: '{Código de Barras}', kind: 'barcode', helperText: 'Usa el SKU del producto.' },
  { key: 'price', label: 'Precio de Venta', token: '{Precio de Venta}', kind: 'text' },
  { key: 'cost', label: 'Costo', token: '{Costo}', kind: 'text' },
  { key: 'stock', label: 'Stock Actual', token: '{Stock Actual}', kind: 'text' },
  { key: 'ownershipType', label: 'Tipo de Propiedad', token: '{Tipo de Propiedad}', kind: 'text' },
  { key: 'consignorName', label: 'Nombre del Consignador', token: '{Nombre del Consignador}', kind: 'text' },
  { key: 'supplierName', label: 'Nombre del Proveedor', token: '{Nombre del Proveedor}', kind: 'text' },
  { key: 'printDate', label: 'Fecha de Impresión (DD/MM/AAAA)', token: '{Fecha de Impresión (DD/MM/AAAA)}', kind: 'text' },
  { key: 'printDateTime', label: 'Fecha y Hora de Impresión', token: '{Fecha y Hora de Impresión}', kind: 'text' },
  { key: 'storeName', label: 'Nombre de la Tienda', token: '{Nombre de la Tienda}', kind: 'text' },
];
