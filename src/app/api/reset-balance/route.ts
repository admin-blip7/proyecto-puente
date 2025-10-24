import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    const consignorId = '6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb';

    // Calcular el balance correcto basado en ventas reales
    const { data: sales } = await supabase
      .from('sales')
      .select('*');

    let calculatedBalance = 0;
    if (sales) {
      console.log('Procesando ventas para calcular balance...');

      for (const sale of sales) {
        const items = sale.items || [];
        for (const item of items) {
          if (item.consignorId === consignorId) {
            // Obtener el costo del producto
            const { data: product } = await supabase
              .from('products')
              .select('cost, name')
              .eq('firestore_id', item.productId)
              .single();

            if (product && product.cost) {
              const itemCost = parseFloat(product.cost) * item.quantity;
              calculatedBalance += itemCost;
              console.log(`- Producto: ${product.name}, Cantidad: ${item.quantity}, Costo unit: ${product.cost}, Total: ${itemCost}`);
            }
          }
        }
      }
    }

    console.log(`Balance calculado correcto: $${calculatedBalance}`);

    // Actualizar el balance del consignador al valor correcto
    const { error } = await supabase
      .from('consignors')
      .update({ balanceDue: calculatedBalance })
      .eq('id', consignorId);

    if (error) {
      console.error('Error actualizando balance:', error);
      return NextResponse.json({
        error: 'No se pudo actualizar el balance',
        details: error.message
      }, { status: 500 });
    }

    // Verificar la actualización
    const { data: updatedConsignor } = await supabase
      .from('consignors')
      .select('name, balanceDue')
      .eq('id', consignorId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Balance corregido exitosamente',
      data: {
        consignor: updatedConsignor?.name,
        newBalance: updatedConsignor?.balanceDue,
        calculatedBalance,
        totalSalesProcessed: sales?.length || 0
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 });
  }
}