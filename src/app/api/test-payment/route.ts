import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    const consignorId = '6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb';

    console.log('Procesando pago para consignador:', consignorId);

    // Obtener balance actual
    const { data: consignor, error: fetchError } = await supabase
      .from('consignors')
      .select('name, balanceDue')
      .eq('id', consignorId)
      .single();

    if (fetchError) {
      console.log('Error obteniendo consignador:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log('Consignador encontrado:', consignor);
    console.log('Balance actual:', consignor.balanceDue);

    const currentBalance = parseFloat(consignor.balanceDue || 0);
    const paymentAmount = 10;

    if (paymentAmount > currentBalance) {
      return NextResponse.json({ error: 'Pago mayor al balance' }, { status: 400 });
    }

    const newBalance = currentBalance - paymentAmount;

    console.log('Actualizando balance de', currentBalance, 'a', newBalance);

    // Intentar actualizar balance
    const { error: updateError } = await supabase
      .from('consignors')
      .update({ balanceDue: newBalance })
      .eq('id', consignorId);

    if (updateError) {
      console.log('Error actualizando balance:', updateError);
      return NextResponse.json({
        error: 'No se pudo actualizar balance',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('Balance actualizado exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Pago registrado',
      data: {
        consignor: consignor.name,
        paymentAmount,
        previousBalance: currentBalance,
        newBalance
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