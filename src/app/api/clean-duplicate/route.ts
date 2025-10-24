import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();

    // Eliminar el registro duplicado con el balance incorrecto
    const { error: deleteError } = await supabase
      .from('consignors')
      .delete()
      .eq('id', 'f3cf8a91-8ab4-4989-a089-f9d9d9741e88');

    if (deleteError) {
      throw deleteError;
    }

    // Verificar los registros restantes
    const { data: remainingConsignors, error: fetchError } = await supabase
      .from('consignors')
      .select('id, name, balanceDue')
      .eq('name', 'Tecnología Del Itsmo');

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({
      success: true,
      message: 'Registro duplicado eliminado exitosamente',
      deletedConsignorId: 'f3cf8a91-8ab4-4989-a089-f9d9d9741e88',
      remainingConsignors: remainingConsignors || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: 'Error eliminando registro duplicado',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 });
  }
}