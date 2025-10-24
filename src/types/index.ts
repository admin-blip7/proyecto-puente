import { z } from "zod";

export type OwnershipType = 'Propio' | 'Consigna' | 'Familiar';

export const ownershipTypes: OwnershipType[] = ['Propio', 'Consigna', 'Familiar'];

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  createdAt: Date;
  type: 'Venta' | 'Refacción';
  ownershipType: OwnershipType;
  consignorId?: string;
  reorderPoint?: number;
  comboProductIds?: string[];
  compatibilityTags?: string[];
  searchKeywords?: string[];
  category?: string; // Categoría especial (ej: "Celular Seminuevo", "Mica")
  attributes?: Record<string, any>; // Atributos específicos por categoría
}


export interface Consignor {
    id: string;
    firestore_id?: string;
    name: string;
    contactInfo: string;
    balanceDue: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactInfo: string;
  notes: string;
  totalPurchasedYTD: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  totalAmount: number;
  status: 'pending' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  shippingInfo?: {
    address?: string;
    trackingNumber?: string;
    estimatedDelivery?: Date;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  history: PurchaseOrderHistoryEntry[];
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku?: string;
  qty: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrderHistoryEntry {
  action: string;
  status: string;
  timestamp: Date;
  user: string;
  notes?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  quantity: number;
  priceAtSale: number;
  serials?: string[];
  consignorId?: string;
}

export interface Sale {
  id: string;
  saleId: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: 'Efectivo' | 'Tarjeta de Crédito' | 'Crédito';
  cashierId: string;
  cashierName?: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: Date;
  sessionId?: string;
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
  reason: 'Venta' | 'Venta a Crédito' | 'Ingreso de Mercancía' | 'Ajuste Manual' | 'Devolución' | 'Creación de Producto' | 'Uso en Reparación';
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
  isNew: boolean;
  ownershipType: OwnershipType;
  consignorId?: string;
  category?: string;
  attributes?: Record<string, any>;
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

export interface ProductVariant {
    id: string;
    productId: string;
    sku: string;
    serialNumber?: string;
    imei?: string;
    price?: number;
    cost?: number;
    status: 'available' | 'sold' | 'reserved' | 'damaged';
    batteryHealth?: number;
    storage?: number;
    aestheticCondition?: string;
    color?: string;
    replacedParts?: string[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
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
    paidFromAccountId: string;
    paymentDate: Date;
    receiptUrl?: string;
    sessionId?: string;
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

export interface BulkUpdateData {
    price?: {
        mode: 'fixed' | 'amount' | 'percent';
        value: number;
    };
    cost?: {
        mode: 'fixed' | 'amount' | 'percent';
        value: number;
    };
    tagsToAdd?: string[];
    tagsToRemove?: string[];
}

export interface CashSession {
    id: string;
    sessionId: string;
    status: 'Abierto' | 'Cerrado';
    openedBy: string;
    openedByName: string;
    openedAt: Date;
    startingFloat: number;
    closedBy?: string;
    closedByName?: string;
    closedAt?: Date;
    totalCashSales: number;
    totalCardSales: number;
    totalCashPayouts: number; // Gastos rápidos
    expectedCashInDrawer: number;
    actualCashCount?: number;
    difference?: number;
}

export const TicketSettingsSchema = z.object({
  header: z.object({
    showLogo: z.boolean(),
    logoUrl: z.string().url().or(z.literal("")).optional(),
    show: z.object({
        storeName: z.boolean(),
        address: z.boolean(),
        phone: z.boolean(),
        rfc: z.boolean(),
        website: z.boolean(),
    }),
    storeName: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    rfc: z.string().optional(),
    website: z.string().optional(),
  }),
  body: z.object({
    showQuantity: z.boolean(),
    showUnitPrice: z.boolean(),
    showTotal: z.boolean(),
    fontSize: z.enum(["xs", "sm", "base"]),
  }),
  footer: z.object({
    showSubtotal: z.boolean(),
    showTaxes: z.boolean(),
    showDiscounts: z.boolean(),
    thankYouMessage: z.string().optional(),
    additionalInfo: z.string().optional(),
    showQrCode: z.boolean(),
    qrCodeUrl: z.string().url().or(z.literal("")).optional(),
  }),
  visualLayout: z.string().nullable().optional(), // JSON string of VisualElement[]
});

export type TicketSettings = z.infer<typeof TicketSettingsSchema>;

export const labelTypes = ["product", "repair"] as const;
export type LabelType = typeof labelTypes[number];

export const labelOrientations = ["horizontal", "vertical"] as const;
export type LabelOrientation = typeof labelOrientations[number];

export const LabelSettingsSchema = z.object({
    width: z.coerce.number().positive(),
    height: z.coerce.number().positive(),
    orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
    fontSize: z.coerce.number().positive(),
    barcodeHeight: z.coerce.number().positive(),
    includeLogo: z.boolean(),
    logoUrl: z.string().refine((val) => val === "" || z.string().url().safeParse(val).success, {
        message: "Must be a valid URL or empty string"
    }).optional(),
    storeName: z.string().optional(),
    content: z.object({
        showProductName: z.boolean(),
        showSku: z.boolean(),
        showPrice: z.boolean(),
        showStoreName: z.boolean(),
    }),
    visualLayout: z.string().nullable().optional(), // JSON string of VisualElement[]
    labelType: z.enum(["product", "repair"]).optional(), // Add labelType field
});

export type LabelSettings = z.infer<typeof LabelSettingsSchema>;

export interface LabelPrintProductContext {
    id?: string;
    name: string;
    sku: string;
    price?: number;
    cost?: number;
    stock?: number;
    ownershipType?: OwnershipType;
    consignorName?: string;
    supplierName?: string;
}

export interface LabelPrintItem {
    product: LabelPrintProductContext;
    quantity: number;
}

export const ContractTemplateSchema = z.object({
    content: z.string(),
    visualLayout: z.string().nullable().optional(), // JSON string of VisualElement[]
});

export type ContractTemplateSettings = z.infer<typeof ContractTemplateSchema>;


// Types for Finance Module
export const accountTypes = ["Banco", "Efectivo", "Billetera Digital", "Otro"] as const;
export type AccountType = typeof accountTypes[number];

export interface Account {
    id: string;
    name: string;
    type: AccountType;
    currentBalance: number;
}


export const debtTypes = ['Tarjeta de Crédito', 'Préstamo Personal', 'Proveedor', 'Otro'] as const;
export type DebtType = typeof debtTypes[number];

export interface Debt {
    id: string;
    creditorName: string;
    debtType: DebtType;
    currentBalance: number;
    createdAt: Date;
    totalLimit?: number;
    closingDate?: number; 
    paymentDueDate?: number; 
    interestRate?: number; 
    cat?: number;
}


export interface DebtPayment {
    id: string;
    debtId: string;
    amountPaid: number;
    paymentDate: Date;
    paidFromAccountId: string;
    proofUrl?: string;
    notes?: string;
}

export interface SavingsGoal {
    id: string;
    goalName: string;
    targetAmount: number;
    currentAmount: number;
}

// Types for Credit & Collection Module
export interface Client {
    id: string;
    clientId: string;
    name: string;
    phone: string;
    address: string;
    curp?: string;
    employmentInfo: {
        workplace: string;
        workPhone: string;
    };
    socialMedia?: {
        facebook?: string;
        instagram?: string;
        whatsapp?: string;
    };
    documents: {
        idUrl?: string;
        proofOfAddressUrl?: string;
    };
    createdAt: Date;
}

export const creditAccountStatuses = ['Al Corriente', 'Atrasado', 'Pagado'] as const;
export type CreditAccountStatus = typeof creditAccountStatuses[number];

export interface CreditAccount {
    id: string;
    accountId: string;
    clientId: string;
    creditLimit: number;
    currentBalance: number;
    status: CreditAccountStatus;
    paymentDueDate: Date;
    interestRate?: number; // Tasa de Interés Anual
}

export interface ClientPayment {
    id: string;
    paymentId: string;
    accountId: string;
    amountPaid: number;
    paymentDate: Date;
    notes?: string;
}

export interface ClientProfile extends Client {
    creditAccount?: CreditAccount;
}

// CRM Types
export type IdentificationType = 'cedula' | 'ruc' | 'pasaporte';
export type ClientType = 'particular' | 'empresa' | 'recurrente';
export type CRMClientStatus = 'active' | 'inactive' | 'pending' | 'blacklisted';
export type InteractionType = 'sale' | 'repair' | 'credit_payment' | 'warranty' | 'contact' | 'consignment' | 'follow_up';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DocumentType = 'identification' | 'contract' | 'warranty' | 'invoice' | 'other';

export interface CRMClient {
    id: string;
    firestore_id?: string;
    clientCode: string;
    identificationType: IdentificationType;
    identificationNumber: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    email?: string;
    phone?: string;
    secondaryPhone?: string;
    address?: string;
    city?: string;
    province?: string;
    clientType: ClientType;
    clientStatus: CRMClientStatus;
    registrationDate: Date;
    lastContactDate?: Date;
    totalPurchases: number;
    outstandingBalance: number;
    creditLimit: number;
    tags: string[];
    notes?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CRMInteraction {
    id: string;
    firestore_id?: string;
    clientId: string;
    interactionType: InteractionType;
    relatedId?: string;
    relatedTable?: string;
    interactionDate: Date;
    description?: string;
    amount?: number;
    status?: string;
    employeeId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface CRMTag {
    id: string;
    firestore_id?: string;
    name: string;
    color: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CRMTask {
    id: string;
    firestore_id?: string;
    clientId: string;
    title: string;
    description?: string;
    dueDate?: Date;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo?: string;
    completedAt?: Date;
    completionNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CRMDocument {
    id: string;
    firestore_id?: string;
    clientId: string;
    documentType: DocumentType;
    documentName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    uploadDate: Date;
    uploadedBy?: string;
    createdAt: Date;
}

export interface CRMClientStats {
    totalClients: number;
    activeClients: number;
    newClientsThisMonth: number;
    totalPurchases: number;
    averagePurchaseValue: number;
    topClients: CRMClient[];
    recentInteractions: CRMInteraction[];
}
