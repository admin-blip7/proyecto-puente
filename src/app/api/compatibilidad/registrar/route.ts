import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST(request: NextRequest) {
  try {
    const { modelo, alto, ancho, micaId, compatibilityLevel } = await request.json();

    if (!modelo || !alto || !ancho || !micaId) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Verificar si ya existe esta compatibilidad
    const { data: existente, error: errorConsulta } = await supabase
      .from('compatibilidades')
      .select('*')
      .eq('modelo_celular', modelo.trim())
      .eq('alto', alto)
      .eq('ancho', ancho)
      .eq('mica_id', micaId)
      .maybeSingle();

    if (errorConsulta) {
      console.error('Error consultando compatibilidad:', errorConsulta);
      return NextResponse.json(
        { error: 'Error al verificar compatibilidad' },
        { status: 500 }
      );
    }

    if (existente) {
      // Si ya existe, incrementar el contador
      const { error: errorUpdate } = await supabase
        .from('compatibilidades')
        .update({
          contador: existente.contador + 1,
          actualizado_at: new Date().toISOString(),
          // Remover temporalmente nivel_compatibilidad hasta que se aplique la migración
          // nivel_compatibilidad: compatibilityLevel || existente.nivel_compatibilidad || 'No compatible',
        })
        .eq('id', existente.id);

      if (errorUpdate) {
        console.error('Error actualizando contador:', errorUpdate);
        return NextResponse.json(
          { error: 'Error al actualizar compatibilidad' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Compatibilidad actualizada',
        contador: existente.contador + 1,
      });
    } else {
      // Si no existe, crear nuevo registro
      const { data: nueva, error: errorInsert } = await supabase
        .from('compatibilidades')
        .insert({
          modelo_celular: modelo.trim(),
          alto,
          ancho,
          mica_id: micaId,
          tienda_id: 'default', // Podría ser dinámico si hay múltiples tiendas
          vendedor_id: null, // Podría obtenerse del usuario autenticado
          contador: 1,
          // Remover temporalmente nivel_compatibilidad hasta que se aplique la migración
          // nivel_compatibilidad: compatibilityLevel || 'No compatible',
        })
        .select()
        .single();

      if (errorInsert) {
        console.error('Error creando compatibilidad:', errorInsert);
        return NextResponse.json(
          { error: 'Error al registrar compatibilidad' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Compatibilidad registrada',
        data: nueva,
      });
    }
  } catch (error) {
    console.error('Error en endpoint registrar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}