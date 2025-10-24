import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();

    // Obtener todos los consignadores para mostrar sus balances actuales
    const { data: consignors, error } = await supabase
      .from('consignors')
      .select('id, name, balanceDue')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Datos actualizados desde la base de datos',
      consignors: consignors || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: 'Error obteniendo datos actualizados',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 });
  }
}