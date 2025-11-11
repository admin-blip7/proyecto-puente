import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type {
  Warranty,
  ProductExchange,
  DamagedProduct,
  CreateWarrantyInput,
  CreateExchangeInput,
  ApproveWarrantyInput,
  RejectWarrantyInput,
  CompleteExchangeInput,
  WarrantyFilters,
  WarrantyStatistics,
  WarrantyValidation,
  PriceDifferenceCalculation,
} from '@/types/warranty';
import { getLogger } from '@/lib/logger';

const log = getLogger('warrantyService');

// Configuración
const MAX_WARRANTY_DAYS = 30; // Días máximos para solicitar garantía

/**
 * Obtener todas las garantías con filtros opcionales
 */
export async function getWarranties(filters?: WarrantyFilters): Promise<Warranty[]> {
  try {
    const supabase = createClientComponentClient();
    
    let query = supabase
      .from('warranties')
      .select(`
        *,
        product:products(id, name, sku, price, category),
        original_sale:sales!original_sale_id(id, sale_number, total, created_at)
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.reason) {
      query = query.eq('reason', filters.reason);
    }
    if (filters?.product_id) {
      query = query.eq('product_id', filters.product_id);
    }
    if (filters?.customer_name) {
      query = query.ilike('customer_name', `%${filters.customer_name}%`);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by);
    }
    if (filters?.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,warranty_folio.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching warranties:', error);
      throw new Error(`Error al obtener garantías: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    log.error('Error in getWarranties:', error);
    throw error;
  }
}

/**
 * Obtener una garantía por ID
 */
export async function getWarrantyById(id: string): Promise<Warranty | null> {
  try {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('warranties')
      .select(`
        *,
        product:products(id, name, sku, price, category),
        original_sale:sales!original_sale_id(id, sale_number, total, created_at)
      `)
      .eq('id', id)
      .single();

    if (error) {
      log.error('Error fetching warranty:', error);
      throw new Error(`Error al obtener garantía: ${error.message}`);
    }

    return data;
  } catch (error) {
    log.error('Error in getWarrantyById:', error);
    throw error;
  }
}

/**
 * Obtener una garantía por folio
 */
export async function getWarrantyByFolio(folio: string): Promise<Warranty | null> {
  try {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('warranties')
      .select(`
        *,
        product:products(id, name, sku, price, category),
        original_sale:sales!original_sale_id(id, sale_number, total, created_at)
      `)
      .eq('warranty_folio', folio)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      log.error('Error fetching warranty by folio:', error);
      throw new Error(`Error al obtener garantía: ${error.message}`);
    }

    return data || null;
  } catch (error) {
    log.error('Error in getWarrantyByFolio:', error);
    throw error;
  }
}

/**
 * Validar si una venta puede tener garantía
 */
export async function validateWarrantyEligibility(
  saleId: string,
  productId: string
): Promise<WarrantyValidation> {
  try {
    const supabase = createClientComponentClient();
    
    // Obtener la venta original
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*, sale_items:sale_items(product_id, quantity, price)')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      return {
        is_valid: false,
        errors: ['Venta no encontrada'],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Calcular días desde la venta
    const saleDate = new Date(sale.created_at);
    const today = new Date();
    const daysSinceSale = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));

    // Validar tiempo de garantía
    if (daysSinceSale > MAX_WARRANTY_DAYS) {
      errors.push(`La garantía ha expirado. Límite: ${MAX_WARRANTY_DAYS} días.`);
    }

    // Verificar que el producto esté en la venta
    const saleItem = sale.sale_items?.find((item: any) => item.product_id === productId);
    if (!saleItem) {
      errors.push('El producto no está en esta venta');
    }

    // Verificar si ya existe una garantía para este producto en esta venta
    const { data: existingWarranty } = await supabase
      .from('warranties')
      .select('id, status')
      .eq('original_sale_id', saleId)
      .eq('product_id', productId)
      .in('status', ['pending', 'approved', 'completed']);

    if (existingWarranty && existingWarranty.length > 0) {
      const pending = existingWarranty.find((w: any) => w.status === 'pending');
      if (pending) {
        errors.push('Ya existe una garantía pendiente para este producto');
      } else {
        warnings.push('Este producto ya tiene garantías registradas');
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      days_since_sale: daysSinceSale,
      max_warranty_days: MAX_WARRANTY_DAYS,
    };
  } catch (error) {
    log.error('Error in validateWarrantyEligibility:', error);
    return {
      is_valid: false,
      errors: ['Error al validar elegibilidad'],
      warnings: [],
    };
  }
}

/**
 * Crear una nueva garantía
 */
export async function createWarranty(input: CreateWarrantyInput): Promise<Warranty> {
  try {
    const supabase = createClientComponentClient();
    
    // Validar elegibilidad
    const validation = await validateWarrantyEligibility(
      input.original_sale_id,
      input.product_id
    );

    if (!validation.is_valid) {
      throw new Error(`Garantía no válida: ${validation.errors.join(', ')}`);
    }

    // Crear la garantía
    const { data, error } = await supabase
      .from('warranties')
      .insert({
        original_sale_id: input.original_sale_id,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        product_id: input.product_id,
        original_quantity: input.original_quantity,
        original_price: input.original_price,
        reason: input.reason,
        description: input.description,
        evidence_url: input.evidence_url,
        created_by: input.created_by,
        status: 'pending',
      })
      .select(`
        *,
        product:products(id, name, sku, price, category),
        original_sale:sales!original_sale_id(id, sale_number, total, created_at)
      `)
      .single();

    if (error) {
      log.error('Error creating warranty:', error);
      throw new Error(`Error al crear garantía: ${error.message}`);
    }

    // Registrar el producto como dañado
    await supabase.from('damaged_products').insert({
      product_id: input.product_id,
      warranty_id: data.id,
      quantity: input.original_quantity,
      reason: input.reason,
      status: 'damaged',
      notes: input.description,
    });

    log.info('Warranty created:', data.warranty_folio);
    return data;
  } catch (error) {
    log.error('Error in createWarranty:', error);
    throw error;
  }
}

/**
 * Aprobar una garantía
 */
export async function approveWarranty(input: ApproveWarrantyInput): Promise<Warranty> {
  try {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('warranties')
      .update({
        status: 'approved',
        approved_by: input.approved_by,
        approved_at: new Date().toISOString(),
        notes: input.notes,
      })
      .eq('id', input.warranty_id)
      .select(`
        *,
        product:products(id, name, sku, price, category),
        original_sale:sales!original_sale_id(id, sale_number, total, created_at)
      `)
      .single();

    if (error) {
      log.error('Error approving warranty:', error);
      throw new Error(`Error al aprobar garantía: ${error.message}`);
    }

    log.info('Warranty approved:', data.warranty_folio);
    return data;
  } catch (error) {
    log.error('Error in approveWarranty:', error);
    throw error;
  }
}

/**
 * Rechazar una garantía
 */
export async function rejectWarranty(input: RejectWarrantyInput): Promise<Warranty> {
  try {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('warranties')
      .update({
        status: 'rejected',
        rejection_reason: input.rejection_reason,
        resolved_at: new Date().toISOString(),
        resolved_by: input.rejected_by,
      })
      .eq('id', input.warranty_id)
      .select(`
        *,
        product:products(id, name, sku, price, category),
        original_sale:sales!original_sale_id(id, sale_number, total, created_at)
      `)
      .single();

    if (error) {
      log.error('Error rejecting warranty:', error);
      throw new Error(`Error al rechazar garantía: ${error.message}`);
    }

    // Actualizar el producto dañado para devolverlo al inventario si aplica
    await supabase
      .from('damaged_products')
      .update({ status: 'returned_to_inventory' })
      .eq('warranty_id', input.warranty_id);

    log.info('Warranty rejected:', data.warranty_folio);
    return data;
  } catch (error) {
    log.error('Error in rejectWarranty:', error);
    throw error;
  }
}

/**
 * Calcular la diferencia de precio entre productos
 */
export function calculatePriceDifference(
  originalPrice: number,
  originalQuantity: number,
  newPrice: number,
  newQuantity: number
): PriceDifferenceCalculation {
  const originalTotal = originalPrice * originalQuantity;
  const newTotal = newPrice * newQuantity;
  const difference = newTotal - originalTotal;

  let differenceType: 'refund' | 'charge' | 'none' = 'none';
  if (difference > 0) {
    differenceType = 'charge';
  } else if (difference < 0) {
    differenceType = 'refund';
  }

  return {
    original_total: originalTotal,
    new_total: newTotal,
    difference: Math.abs(difference),
    difference_type: differenceType,
    formatted_difference: new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Math.abs(difference)),
  };
}

/**
 * Crear un cambio de producto (exchange)
 */
export async function createProductExchange(
  input: CreateExchangeInput
): Promise<ProductExchange> {
  try {
    const supabase = createClientComponentClient();
    
    // Verificar que la garantía esté aprobada
    const { data: warranty, error: warrantyError } = await supabase
      .from('warranties')
      .select('*')
      .eq('id', input.warranty_id)
      .single();

    if (warrantyError || !warranty) {
      throw new Error('Garantía no encontrada');
    }

    if (warranty.status !== 'approved') {
      throw new Error('La garantía debe estar aprobada antes de procesar el cambio');
    }

    // Verificar stock del nuevo producto
    const { data: newProduct, error: productError } = await supabase
      .from('products')
      .select('id, name, price, stock')
      .eq('id', input.new_product_id)
      .single();

    if (productError || !newProduct) {
      throw new Error('Producto sustituto no encontrado');
    }

    if (newProduct.stock < input.new_quantity) {
      throw new Error(`Stock insuficiente. Disponible: ${newProduct.stock}`);
    }

    // Calcular diferencia de precio
    const priceDifference = calculatePriceDifference(
      warranty.original_price,
      warranty.original_quantity,
      input.new_product_price,
      input.new_quantity
    );

    // Crear el exchange
    const { data: exchange, error: exchangeError } = await supabase
      .from('product_exchanges')
      .insert({
        warranty_id: input.warranty_id,
        new_product_id: input.new_product_id,
        new_quantity: input.new_quantity,
        new_product_price: input.new_product_price,
        price_difference: priceDifference.difference_type === 'charge' 
          ? priceDifference.difference 
          : -priceDifference.difference,
        payment_method: input.payment_method || 'none',
        exchange_status: 'pending',
        notes: input.notes,
      })
      .select(`
        *,
        warranty:warranties(*),
        new_product:products(id, name, sku, price, stock)
      `)
      .single();

    if (exchangeError) {
      log.error('Error creating exchange:', exchangeError);
      throw new Error(`Error al crear cambio: ${exchangeError.message}`);
    }

    log.info('Product exchange created:', exchange.id);
    return exchange;
  } catch (error) {
    log.error('Error in createProductExchange:', error);
    throw error;
  }
}

/**
 * Completar un cambio de producto
 */
export async function completeProductExchange(
  input: CompleteExchangeInput
): Promise<ProductExchange> {
  try {
    const supabase = createClientComponentClient();
    
    // Obtener el exchange con todos sus datos
    const { data: exchange, error: exchangeError } = await supabase
      .from('product_exchanges')
      .select(`
        *,
        warranty:warranties(*,
          original_sale:sales!original_sale_id(*),
          product:products(*)
        ),
        new_product:products(*)
      `)
      .eq('id', input.exchange_id)
      .single();

    if (exchangeError || !exchange) {
      throw new Error('Cambio no encontrado');
    }

    if (exchange.exchange_status === 'completed') {
      throw new Error('Este cambio ya fue completado');
    }

    // Iniciar transacción (simulada con múltiples operaciones)
    
    // 1. Si hay diferencia de precio positiva, crear una nueva venta
    let newSaleId: string | undefined;
    if (exchange.price_difference > 0) {
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_name: exchange.warranty.customer_name,
          customer_phone: exchange.warranty.customer_phone,
          total: exchange.price_difference,
          subtotal: exchange.price_difference,
          tax: 0,
          discount: 0,
          payment_method: exchange.payment_method || 'cash',
          is_exchange_sale: true,
          original_sale_id: exchange.warranty.original_sale_id,
          warranty_folio: exchange.warranty.warranty_folio,
          exchange_id: exchange.id,
          status: 'completed',
        })
        .select('id')
        .single();

      if (saleError) {
        throw new Error(`Error al crear venta de diferencia: ${saleError.message}`);
      }
      
      newSaleId = newSale.id;

      // Crear el item de la venta
      await supabase.from('sale_items').insert({
        sale_id: newSale.id,
        product_id: exchange.new_product_id,
        quantity: exchange.new_quantity,
        price: exchange.new_product_price,
        discount: 0,
        subtotal: exchange.price_difference,
      });
    }

    // 2. Actualizar inventario del producto nuevo (descontar)
    await supabase.rpc('update_product_stock', {
      p_product_id: exchange.new_product_id,
      p_quantity_change: -exchange.new_quantity,
    });

    // 3. Actualizar inventario del producto original (devolver o marcar como dañado)
    // Por ahora lo dejamos en damaged_products

    // 4. Actualizar el exchange como completado
    const { data: updatedExchange, error: updateError } = await supabase
      .from('product_exchanges')
      .update({
        exchange_status: 'completed',
        completed_at: new Date().toISOString(),
        new_sale_id: newSaleId,
        notes: input.notes ? `${exchange.notes || ''}\n${input.notes}` : exchange.notes,
      })
      .eq('id', input.exchange_id)
      .select(`
        *,
        warranty:warranties(*),
        new_product:products(id, name, sku, price, stock)
      `)
      .single();

    if (updateError) {
      throw new Error(`Error al actualizar exchange: ${updateError.message}`);
    }

    // 5. Actualizar la garantía como completada
    await supabase
      .from('warranties')
      .update({
        status: 'completed',
        resolved_at: new Date().toISOString(),
        resolved_by: input.completed_by,
      })
      .eq('id', exchange.warranty_id);

    log.info('Product exchange completed:', exchange.id);
    return updatedExchange;
  } catch (error) {
    log.error('Error in completeProductExchange:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas de garantías
 */
export async function getWarrantyStatistics(): Promise<WarrantyStatistics[]> {
  try {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('warranty_statistics')
      .select('*')
      .order('warranty_count', { ascending: false });

    if (error) {
      log.error('Error fetching warranty statistics:', error);
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    log.error('Error in getWarrantyStatistics:', error);
    throw error;
  }
}

/**
 * Obtener productos dañados
 */
export async function getDamagedProducts(status?: string): Promise<DamagedProduct[]> {
  try {
    const supabase = createClientComponentClient();
    
    let query = supabase
      .from('damaged_products')
      .select(`
        *,
        product:products(id, name, sku)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching damaged products:', error);
      throw new Error(`Error al obtener productos dañados: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    log.error('Error in getDamagedProducts:', error);
    throw error;
  }
}

/**
 * Actualizar estado de producto dañado
 */
export async function updateDamagedProductStatus(
  id: string,
  status: string,
  notes?: string
): Promise<DamagedProduct> {
  try {
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase
      .from('damaged_products')
      .update({
        status,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        product:products(id, name, sku)
      `)
      .single();

    if (error) {
      log.error('Error updating damaged product:', error);
      throw new Error(`Error al actualizar producto dañado: ${error.message}`);
    }

    // Si se devuelve al inventario, actualizar stock
    if (status === 'returned_to_inventory' && data) {
      await supabase.rpc('update_product_stock', {
        p_product_id: data.product_id,
        p_quantity_change: data.quantity,
      });
    }

    return data;
  } catch (error) {
    log.error('Error in updateDamagedProductStatus:', error);
    throw error;
  }
}

/**
 * Obtener cambios de productos (exchanges)
 */
export async function getProductExchanges(warrantyId?: string): Promise<ProductExchange[]> {
  try {
    const supabase = createClientComponentClient();
    
    let query = supabase
      .from('product_exchanges')
      .select(`
        *,
        warranty:warranties(*,
          product:products(id, name, sku, price),
          original_sale:sales!original_sale_id(id, sale_number)
        ),
        new_product:products(id, name, sku, price, stock)
      `)
      .order('created_at', { ascending: false });

    if (warrantyId) {
      query = query.eq('warranty_id', warrantyId);
    }

    const { data, error } = await query;

    if (error) {
      log.error('Error fetching product exchanges:', error);
      throw new Error(`Error al obtener cambios: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    log.error('Error in getProductExchanges:', error);
    throw error;
  }
}
