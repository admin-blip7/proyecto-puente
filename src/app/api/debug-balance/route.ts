import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const consignorId = '6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb';

    // Obtener el balance actual del consignador
    const { data: consignor, error } = await supabase
      .from('consignors')
      .select('name, balanceDue')
      .eq('id', consignorId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calcular el balance basado en ventas reales
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*');

    let calculatedBalance = 0;
    if (!salesError && sales) {
      // Para cada venta, obtener el costo de los productos
      for (const sale of sales) {
        const items = sale.items || [];
        for (const item of items) {
          if (item.consignorId === consignorId) {
            // Obtener el costo del producto
            const { data: product } = await supabase
              .from('products')
              .select('cost')
              .eq('firestore_id', item.productId)
              .single();

            if (product && product.cost) {
              calculatedBalance += parseFloat(product.cost) * item.quantity;
            }
          }
        }
      }
    }

    return NextResponse.json({
      consignor: consignor?.name,
      currentBalance: consignor?.balanceDue || 0,
      calculatedBalance,
      difference: (consignor?.balanceDue || 0) - calculatedBalance,
      totalSales: sales?.length || 0,
      details: calculatedBalance !== (consignor?.balanceDue || 0) ? 'Balance needs update' : 'Balance is correct'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}