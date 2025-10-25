import { NextResponse } from 'next/server'

export async function GET() {
  // Recolectar todas las variables de entorno relevantes
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?
      process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...' : 'NOT_SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?
      `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...(${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length} chars)` : 'NOT_SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?
      `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...(${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : 'NOT_SET',
    // Otras variables útiles para debugging
    NETLIFY: process.env.NETLIFY,
    DEPLOY_ID: process.env.DEPLOY_ID,
    SITE_NAME: process.env.SITE_NAME,
    URL: process.env.URL,
    // Verificar si hay variables con prefijo diferente
    allEnvKeys: Object.keys(process.env).filter(key =>
      key.toLowerCase().includes('supabase') ||
      key.toLowerCase().includes('next') ||
      key.toLowerCase().includes('netlify')
    )
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    success: true,
    environment: envVars
  })
}