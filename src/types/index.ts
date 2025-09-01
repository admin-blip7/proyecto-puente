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
  createdAt: Date;
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
