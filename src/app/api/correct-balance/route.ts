import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    const consignorId = '6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb';

    // Calcular el balance correcto basado en ventas
    const { data: sales } = await supabase
      .from('sales')
      .select('*');

    let calculatedBalance = 0;
    if (sales) {
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

    // Actualizar el balance del consignador
    const { error } = await supabase
      .from('consignors')
      .update({
        balanceDue: calculatedBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', consignorId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Balance actualizado correctamente',
      oldBalance: 2934,
      newBalance: calculatedBalance,
      totalSalesWithConsignorItems: sales?.filter(s =>
        s.items?.some((item: any) => item.consignorId === consignorId)
      ).length || 0
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar balance', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}