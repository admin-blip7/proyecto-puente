import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const modelo = searchParams.get('modelo');

    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('compatibilidades')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          price,
          stock
        )
      `)
      .order('contador', { ascending: false })
      .order('creado_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Si se filtra por modelo
    if (modelo) {
      query = query.ilike('modelo_celular', `%${modelo}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error obteniendo historial:', error);
      return NextResponse.json(
        { error: 'Error al obtener historial' },
        { status: 500 }
      );
    }

    // Formatear los datos para incluir el producto
    const historialFormateado = data.map((item) => ({
      ...item,
      product: item.products,
      products: undefined, // Remover la propiedad anidada
    }));

    return NextResponse.json(historialFormateado);
  } catch (error) {
    console.error('Error en endpoint historial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}