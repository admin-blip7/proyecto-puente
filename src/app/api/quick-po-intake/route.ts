import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import { getLogger } from '@/lib/logger';
import { nowIso } from '@/lib/supabase/utils';

const log = getLogger('QuickPOIntakeAPI');

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { action } = body;

    log.info('Quick PO Intake API request', { action });

    switch (action) {
      case 'searchProducts': {
        const { query } = body;
        
        if (!query || typeof query !== 'string') {
          return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // Normalizar el texto para búsqueda
        const normalizedQuery = query
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const tokens = normalizedQuery.split(' ').filter(t => t.length > 1).slice(0, 3);

        if (tokens.length === 0) {
          return NextResponse.json({ products: [] });
        }

        // Buscar productos que coincidan con los tokens
        const { data: products, error } = await supabase
          .from('products')
          .select('*')
          .or(tokens.map(token => `name.ilike.%${token}%`).join(','))
          .limit(20);

        if (error) {
          log.error('Error searching products', error);
          return NextResponse.json({ error: 'Error searching products' }, { status: 500 });
        }

        return NextResponse.json({ products: products ?? [] });
      }

      case 'listSuppliers': {
        const { data: suppliers, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          log.error('Error listing suppliers', error);
          return NextResponse.json({ error: 'Error listing suppliers' }, { status: 500 });
        }

        return NextResponse.json({ suppliers: suppliers ?? [] });
      }

      case 'savePurchaseOrder': {
        const {
          supplier,
          orderNumber,
          status,
          totalAmount,
          notes,
          shipping,
          items,
          history
        } = body;

        if (!supplier || !items || items.length === 0) {
          return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Guardar la orden de compra
        const { data: order, error: orderError } = await supabase
          .from('purchase_orders')
          .insert({
            supplier,
            order_number: orderNumber,
            status,
            total_amount: totalAmount,
            notes,
            shipping,
            created_at: nowIso(),
            updated_at: nowIso(),
          })
          .select()
          .single();

        if (orderError) {
          log.error('Error creating purchase order', orderError);
          return NextResponse.json({ error: 'Error creating purchase order' }, { status: 500 });
        }

        // Guardar los items de la orden
        const itemsToInsert = items.map((item: any) => ({
          purchase_order_id: order.id,
          quantity: item.qty,
          product_name: item.productName || item.rawName,
          product_id: item.productId,
          cost: item.cost,
          sale_price: item.salePrice,
          allocated_shipping: item.allocatedShippingPerUnit,
          final_cost: item.finalCost,
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);

        if (itemsError) {
          log.error('Error creating purchase order items', itemsError);
          return NextResponse.json({ error: 'Error creating purchase order items' }, { status: 500 });
        }

        // Guardar historial
        if (history && history.length > 0) {
          const historyToInsert = history.map((entry: any) => ({
            purchase_order_id: order.id,
            action: entry.action,
            status: entry.status,
            user: entry.user,
            notes: entry.notes,
            timestamp: entry.timestamp || nowIso(),
          }));

          await supabase.from('purchase_order_history').insert(historyToInsert);
        }

        return NextResponse.json({ order });
      }

      case 'confirmArrival': {
        const { items, userId, purchaseOrderId } = body;

        if (!items || items.length === 0) {
          return NextResponse.json({ error: 'Missing items' }, { status: 400 });
        }

        // Actualizar inventario para cada item
        for (const item of items) {
          if (!item.productId) continue;

          // Buscar el producto actual
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', item.productId)
            .single();

          if (product) {
            // Actualizar stock
            const { error: updateError } = await supabase
              .from('products')
              .update({
                stock: (product.stock || 0) + item.qty,
                updated_at: nowIso(),
              })
              .eq('id', item.productId);

            if (updateError) {
              log.error(`Error updating stock for product ${item.productId}`, updateError);
            }
          }
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    log.error('Quick PO Intake API error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
