import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    const consignorId = '6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb';

    console.log('Procesando pago final para consignador:', consignorId);

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

    // Pagar el saldo restante
    const paymentAmount = currentBalance; // Pagar todo el saldo restante

    if (paymentAmount <= 0) {
      return NextResponse.json({ error: 'No hay saldo pendiente' }, { status: 400 });
    }

    const newBalance = currentBalance - paymentAmount;

    console.log('Actualizando balance de', currentBalance, 'a', newBalance);

    // Actualizar balance
    const { error: updateError } = await supabase
      .from('consignors')
      .update({
        balanceDue: newBalance
      })
      .eq('id', consignorId);

    if (updateError) {
      console.log('Error actualizando balance:', updateError);
      return NextResponse.json({
        error: 'No se pudo actualizar balance',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('Balance actualizado exitosamente');

    // Registrar en tabla de transacciones si existe
    try {
      const { error: transactionError } = await supabase
        .from('consignor_transactions')
        .insert([{
          consignorId,
          type: 'payment',
          amount: paymentAmount,
          paymentMethod: 'Efectivo',
          notes: 'Pago final - saldo liquidado',
          previousBalance: currentBalance,
          newBalance,
          createdAt: new Date().toISOString()
        }]);

      if (transactionError && transactionError.code !== 'PGRST116') {
        console.warn('Could not register transaction:', transactionError);
      }
    } catch (error) {
      console.warn('Transaction table not found:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Saldo liquidado completamente',
      data: {
        consignor: consignor.name,
        paymentAmount,
        previousBalance: currentBalance,
        newBalance,
        timestamp: new Date().toISOString(),
        status: newBalance === 0 ? 'Saldado' : 'Pendiente'
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