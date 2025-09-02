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
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtSale: number;
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

export interface Repair {
    id: string;
    customerName: string;
    customerPhone: string;
    deviceModel: string;
    deviceImei: string;
    reportedIssue: string;
    status: 'Ingresado' | 'En Diagnóstico' | 'Esperando Refacción' | 'Reparado' | 'Listo para Entrega' | 'Entregado';
    technicianNotes?: string;
    cost: number;
    createdAt: Date;
    completedAt?: Date;
}

export interface InventoryLog {
  id: string;
  productId: string;
  change: number;
  reason: 'Venta realizada' | 'Ajuste manual' | 'Devolución' | 'Abastecimiento';
  updatedBy: string;
  createdAt: Date;
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
