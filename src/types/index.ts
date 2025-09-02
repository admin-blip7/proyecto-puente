export type OwnershipType = 'Propio' | 'Consigna' | 'Familiar';

export const ownershipTypes: OwnershipType[] = ['Propio', 'Consigna', 'Familiar'];

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
  ownershipType: OwnershipType;
  consignorId?: string;
}

export interface Consignor {
    id: string;
    name: string;
    contactInfo: string;
    balanceDue: number;
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
  customerName: string | null;
  customerPhone: string | null;
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

export interface StockEntryItem {
  id: string; 
  productId?: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
  category: string;
  isNew: boolean;
  ownershipType: OwnershipType;
  consignorId?: string;
}

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
    totalCost: number; 
    totalPrice: number; 
    profit: number;
    createdAt: Date;
    completedAt?: Date;
}

export const paymentMethods = ["Transferencia Bancaria", "Efectivo", "Depósito"] as const;
export type PaymentMethod = typeof paymentMethods[number];

export interface ConsignorPayment {
    id: string;
    paymentId: string;
    consignorId: string;
    amountPaid: number;
    paymentDate: Date;
    paymentMethod: PaymentMethod;
    proofOfPaymentUrl: string;
    notes?: string;
}

export interface ExpenseCategory {
    id: string;
    name: string;
    isActive: boolean;
}

export interface Expense {
    id: string;
    expenseId: string;
    description: string;
    category: string;
    amount: number;
    paymentDate: Date;
    receiptUrl?: string;
}

export const assetCategories = [
    "Mobiliario y Equipo de Oficina",
    "Equipo de Cómputo",
    "Herramientas y Equipo Técnico",
    "Vehículos",
    "Edificios e Instalaciones",
    "Otro"
] as const;
export type AssetCategory = typeof assetCategories[number];

export const depreciationMethods = ["Lineal"] as const;
export type DepreciationMethod = typeof depreciationMethods[number];

export interface FixedAsset {
    id: string;
    assetId: string;
    name: string;
    category: AssetCategory;
    purchaseDate: Date;
    purchaseCost: number;
    usefulLifeYrs: number;
    salvageValue: number;
    currentValue: number;
    depreciationMethod: DepreciationMethod;
    lastDepreciationDate: Date;
}
