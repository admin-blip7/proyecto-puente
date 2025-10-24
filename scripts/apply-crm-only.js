#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno de Supabase');
  console.error('   Valores actuales:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ No configurado');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Configurado' : '❌ No configurado');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Configurado' : '❌ No configurado');
  process.exit(1);
}

// Inicializar cliente con service role key para tener permisos completos
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Función para ejecutar SQL directamente a través de la API REST de Supabase
async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: sql
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    return {
      success: true,
      data: await response.json()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function createCMROnly() {
  console.log('🚀 Iniciando creación de tablas CRM solo...');
  
  try {
    // 1. Crear tabla crm_clients si no existe
    console.log('🏗️  Creando tabla crm_clients...');
    const createClientsTable = `
      CREATE TABLE IF NOT EXISTS public.crm_clients (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        company VARCHAR(255),
        industry VARCHAR(100),
        website VARCHAR(255),
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const result1 = await executeSQL(createClientsTable);
    if (!result1.success) {
      console.error('❌ Error creando tabla crm_clients:', result1.error);
      return false;
    }
    console.log('✅ Tabla crm_clients creada exitosamente');
    
    // 2. Crear tabla crm_tags si no existe
    console.log('🏗️  Creando tabla crm_tags...');
    const createTagsTable = `
      CREATE TABLE IF NOT EXISTS public.crm_tags (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(7) DEFAULT '#007bff',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const result2 = await executeSQL(createTagsTable);
    if (!result2.success) {
      console.error('❌ Error creando tabla crm_tags:', result2.error);
      return false;
    }
    console.log('✅ Tabla crm_tags creada exitosamente');
    
    // 3. Crear tabla de relación crm_client_tags
    console.log('🏗️  Creando tabla crm_client_tags...');
    const createClientTagsTable = `
      CREATE TABLE IF NOT EXISTS public.crm_client_tags (
        client_id UUID REFERENCES public.crm_clients(id) ON DELETE CASCADE,
        tag_id UUID REFERENCES public.crm_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (client_id, tag_id)
      );
    `;
    
    const result3 = await executeSQL(createClientTagsTable);
    if (!result3.success) {
      console.error('❌ Error creando tabla crm_client_tags:', result3.error);
      return false;
    }
    console.log('✅ Tabla crm_client_tags creada exitosamente');
    
    // 4. Crear índices
    console.log('📊 Creando índices...');
    const createIndices = `
      CREATE INDEX IF NOT EXISTS idx_crm_clients_email ON public.crm_clients(email);
      CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON public.crm_clients(status);
      CREATE INDEX IF NOT EXISTS idx_crm_tags_name ON public.crm_tags(name);
    `;
    
    const result4 = await executeSQL(createIndices);
    if (!result4.success) {
      console.error('❌ Error creando índices:', result4.error);
      return false;
    }
    console.log('✅ Índices creados exitosamente');
    
    // 5. Configurar RLS (Row Level Security)
    console.log('🔒 Configurando RLS...');
    const enableRLS = `
      ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.crm_client_tags ENABLE ROW LEVEL SECURITY;
      
      -- Políticas para crm_clients
      CREATE POLICY "crm_clients_select_policy" ON public.crm_clients FOR SELECT USING (true);
      CREATE POLICY "crm_clients_insert_policy" ON public.crm_clients FOR INSERT WITH CHECK (true);
      CREATE POLICY "crm_clients_update_policy" ON public.crm_clients FOR UPDATE USING (true);
      CREATE POLICY "crm_clients_delete_policy" ON public.crm_clients FOR DELETE USING (true);
      
      -- Políticas para crm_tags
      CREATE POLICY "crm_tags_select_policy" ON public.crm_tags FOR SELECT USING (true);
      CREATE POLICY "crm_tags_insert_policy" ON public.crm_tags FOR INSERT WITH CHECK (true);
      CREATE POLICY "crm_tags_update_policy" ON public.crm_tags FOR UPDATE USING (true);
      CREATE POLICY "crm_tags_delete_policy" ON public.crm_tags FOR DELETE USING (true);
    `;
    
    const result5 = await executeSQL(enableRLS);
    if (!result5.success) {
      console.error('❌ Error configurando RLS:', result5.error);
      return false;
    }
    console.log('✅ RLS configurado exitosamente');
    
    console.log('🎉 ¡Todas las tablas CRM han sido creadas exitosamente!');
    console.log('📋 Tablas creadas:');
    console.log('   - crm_clients (clientes)');
    console.log('   - crm_tags (etiquetas)');
    console.log('   - crm_client_tags (relación muchos a muchos)');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error detallado:', error.message);
    console.error('🔍 Código de error:', error.code);
    console.error('📋 Detalles:', error.details);
    return false;
  }
}

// Ejecutar la función
createCMROnly().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Error crítico:', error);
  process.exit(1);
});