import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Faltan variables de entorno de Supabase',
        env: {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'Configurada' : 'No configurada',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'Configurada' : 'No configurada'
        }
      }, { status: 500 })
    }

    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Probar conexión simple
    const { data, error } = await supabase
      .from 'profiles'
      .select('count')
      .limit(1)

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Error al conectar con Supabase',
        details: error.message,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey.substring(0, 20) + '...'
        }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Conexión a Supabase establecida correctamente',
      timestamp: new Date().toISOString(),
      env: {
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Configurada correctamente'
      }
    })
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: 'Error inesperado',
      details: err instanceof Error ? err.message : 'Error desconocido'
    }, { status: 500 })
  }
}