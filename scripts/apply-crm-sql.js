#!/usr/bin/env node
require('dotenv').config();

const { execSync } = require('child_process');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno de Supabase');
  process.exit(1);
}

console.log('🚀 Iniciando creación de tablas CRM usando Supabase CLI...');

// SQL para crear las tablas CRM
const sqlCommands = `
-- Crear tabla crm_clients
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

-- Crear tabla crm_tags
CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#007bff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de relación crm_client_tags
CREATE TABLE IF NOT EXISTS public.crm_client_tags (
  client_id UUID REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_crm_clients_email ON public.crm_clients(email);
CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON public.crm_clients(status);
CREATE INDEX IF NOT EXISTS idx_crm_tags_name ON public.crm_tags(name);

-- Configurar RLS (Row Level Security)
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

-- Insertar datos de ejemplo
INSERT INTO public.crm_tags (name, color) VALUES 
  ('VIP', '#ff6b6b'),
  ('Regular', '#4ecdc4'),
  ('Prospecto', '#45b7d1'),
  ('Importante', '#96ceb4')
ON CONFLICT (name) DO NOTHING;
`;

try {
  console.log('🏗️  Ejecutando comandos SQL...');
  
  // Usar psql para ejecutar los comandos SQL directamente
  const command = `psql "${supabaseUrl}/postgres?sslmode=require" -c "${sqlCommands.replace(/"/g, '\\"')}"`;
  
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PGPASSWORD: process.env.SUPABASE_DB_PASSWORD || ''
    }
  });
  
  console.log('✅ ¡Todas las tablas CRM han sido creadas exitosamente!');
  console.log('📋 Tablas creadas:');
  console.log('   - crm_clients (clientes)');
  console.log('   - crm_tags (etiquetas)');
  console.log('   - crm_client_tags (relación muchos a muchos)');
  console.log('   - Índices y RLS configurados');
  console.log('   - Datos de ejemplo insertados');
  
} catch (error) {
  console.error('❌ Error ejecutando comandos SQL:', error.message);
  process.exit(1);
}