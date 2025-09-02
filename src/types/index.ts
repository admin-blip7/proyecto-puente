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

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  change: number;
  reason: 'Venta' | 'Ingreso de Mercancía' | 'Ajuste Manual' | 'Devolución' | 'Creación de Producto';
  updatedBy: string; // User ID
  createdAt: Date;
  metadata?: {
    saleId?: string;
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
