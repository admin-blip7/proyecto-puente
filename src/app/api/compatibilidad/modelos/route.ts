import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Obtener modelos únicos ordenados por frecuencia
    const { data, error } = await supabase
      .from('compatibilidades')
      .select('modelo_celular')
      .order('contador', { ascending: false });

    if (error) {
      console.error('Error obteniendo modelos:', error);
      return NextResponse.json(
        { error: 'Error al obtener modelos' },
        { status: 500 }
      );
    }

    // Extraer modelos únicos manteniendo el orden por frecuencia
    const modelosUnicos = Array.from(
      new Map(data.map((item) => [item.modelo_celular, item.modelo_celular])).values()
    );

    return NextResponse.json(modelosUnicos);
  } catch (error) {
    console.error('Error en endpoint modelos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}