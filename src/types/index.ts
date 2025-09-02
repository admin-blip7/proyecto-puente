export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  imageUrl: string;
  createdAt: Date;
  type: 'Venta' | 'Refacción';
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtSale: number;
  serials?: string[];
}

export interface Sale {
  id: string;
  saleId: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: 'Efectivo' | 'Tarjeta de Crédito';
  cashierId: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: Date;
}

export interface Warranty {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  customerName?: string;
  customerPhone?: string;
  reason: string;
  status: 'Pendiente' | 'En Revisión' | 'Resuelta' | 'Rechazada';
  reportedAt: Date;
  resolutionDetails?: string;
  resolvedAt?: Date;
  imageUrls?: string[];
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  change: number;
  reason: 'Venta' | 'Ingreso de Mercancía' | 'Ajuste Manual' | 'Devolución' | 'Creación de Producto' | 'Uso en Reparación';
  updatedBy: string; // User ID
  createdAt: Date;
  metadata?: {
    saleId?: string;
    repairOrderId?: string;
    cost?: number;
  };
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'Admin' | 'Cajero';
}

export interface CartItem extends Product {
  quantity: number;
}

// Types for the new Stock Entry module
export interface StockEntryItem {
  id: string; // Can be a temporary UUID for new products
  productId?: string; // Will exist for existing products
  sku: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
  category: string;
  isNew: boolean;
}

// Types for Repair Orders Module
export interface RepairPart {
    productId: string;
    name: string;
    quantity: number;
    cost: number;
    price: number;
}

export const repairStatuses = ["Recibido", "En Diagnóstico", "Esperando Refacción", "En Reparación", "Listo para Entrega", "Completado", "Cancelado"] as const;

export type RepairStatus = typeof repairStatuses[number];


export interface RepairOrder {
    id: string;
    orderId: string;
    status: RepairStatus;
    customerName: string;
    customerPhone: string;
    deviceBrand: string;
    deviceModel: string;
    deviceSerialIMEI: string;
    reportedIssue: string;
    technicianNotes?: string;
    partsUsed: RepairPart[];
    laborCost: number;
    totalCost: number; // Sum of partsUsed[].cost
    totalPrice: number; // Sum of partsUsed[].price + laborCost
    profit: number; // totalPrice - totalCost
    createdAt: Date;
    completedAt?: Date;
}
