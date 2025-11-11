// Tipos para el sistema de garantías

export type WarrantyReason = 'damaged' | 'defective' | 'wrong_product' | 'other';
export type WarrantyStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type ExchangeStatus = 'pending' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'credit' | 'none';
export type DamagedProductStatus = 'damaged' | 'returned_to_inventory' | 'discarded' | 'sent_to_manufacturer';

export interface Warranty {
  id: string;
  original_sale_id: string;
  warranty_folio: string;
  customer_name: string;
  customer_phone?: string;
  product_id: string;
  original_quantity: number;
  original_price: number;
  reason: WarrantyReason;
  description?: string;
  evidence_url?: string;
  status: WarrantyStatus;
  rejection_reason?: string;
  created_at: string;
  resolved_at?: string;
  approved_at?: string;
  created_by?: string;
  approved_by?: string;
  resolved_by?: string;
  notes?: string;
  
  // Relaciones expandidas (opcional)
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    category?: string;
  };
  original_sale?: {
    id: string;
    sale_number: string;
    total: number;
    created_at: string;
  };
}

export interface ProductExchange {
  id: string;
  warranty_id: string;
  new_product_id: string;
  new_quantity: number;
  new_product_price: number;
  price_difference: number;
  payment_method?: PaymentMethod;
  exchange_status: ExchangeStatus;
  new_sale_id?: string;
  created_at: string;
  completed_at?: string;
  notes?: string;
  
  // Relaciones expandidas (opcional)
  warranty?: Warranty;
  new_product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
  };
}

export interface DamagedProduct {
  id: string;
  product_id: string;
  warranty_id?: string;
  quantity: number;
  reason: string;
  status: DamagedProductStatus;
  created_at: string;
  updated_at: string;
  notes?: string;
  
  // Relaciones expandidas
  product?: {
    id: string;
    name: string;
    sku: string;
  };
}

export interface CreateWarrantyInput {
  original_sale_id: string;
  customer_name: string;
  customer_phone?: string;
  product_id: string;
  original_quantity: number;
  original_price: number;
  reason: WarrantyReason;
  description?: string;
  evidence_url?: string;
  created_by?: string;
}

export interface CreateExchangeInput {
  warranty_id: string;
  new_product_id: string;
  new_quantity: number;
  new_product_price: number;
  payment_method?: PaymentMethod;
  notes?: string;
}

export interface ApproveWarrantyInput {
  warranty_id: string;
  approved_by: string;
  notes?: string;
}

export interface RejectWarrantyInput {
  warranty_id: string;
  rejection_reason: string;
  rejected_by: string;
}

export interface CompleteExchangeInput {
  exchange_id: string;
  completed_by: string;
  notes?: string;
}

export interface WarrantyFilters {
  status?: WarrantyStatus;
  reason?: WarrantyReason;
  product_id?: string;
  customer_name?: string;
  date_from?: string;
  date_to?: string;
  created_by?: string;
  search?: string;
}

export interface WarrantyStatistics {
  product_id: string;
  product_name: string;
  category?: string;
  warranty_count: number;
  completed_count: number;
  rejected_count: number;
  pending_count: number;
  total_warranty_value: number;
  avg_resolution_hours?: number;
}

export interface WarrantyReport {
  total_warranties: number;
  pending_warranties: number;
  completed_warranties: number;
  rejected_warranties: number;
  total_value: number;
  avg_resolution_time: number;
  top_defective_products: Array<{
    product_id: string;
    product_name: string;
    warranty_count: number;
    total_value: number;
  }>;
  warranties_by_reason: Array<{
    reason: WarrantyReason;
    count: number;
    percentage: number;
  }>;
  monthly_trend: Array<{
    month: string;
    count: number;
    value: number;
  }>;
}

// Tipos para validación de garantías
export interface WarrantyValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  days_since_sale?: number;
  max_warranty_days?: number;
}

// Tipo para el resultado del cálculo de diferencia
export interface PriceDifferenceCalculation {
  original_total: number;
  new_total: number;
  difference: number;
  difference_type: 'refund' | 'charge' | 'none';
  formatted_difference: string;
}
