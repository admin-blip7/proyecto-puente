// Script simple para aplicar migraciones CRM a Supabase
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceRoleKey,
        'Authorization': `Bearer ${supabaseServiceRoleKey}`
      },
      body: sql
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SQL execution failed: ${errorText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    throw new Error(`Network/SQL error: ${error.message}`);
  }
}

async function checkIfTableExists(tableName) {
  try {
    const sql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );
    `;
    
    const result = await executeSQL(sql);
    return result[0].exists;
  } catch (error) {
    console.log(`⚠️  Could not check table ${tableName}:`, error.message);
    return false;
  }
}

async function createCRMClientsTable() {
  console.log('🏗️  Creating crm_clients table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS crm_clients (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      firestore_id TEXT UNIQUE NOT NULL,
      client_code TEXT UNIQUE NOT NULL,
      identification_type TEXT NOT NULL CHECK (identification_type IN ('cedula', 'ruc', 'pasaporte')),
      identification_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      company_name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      secondary_phone TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      client_type TEXT NOT NULL DEFAULT 'particular' CHECK (client_type IN ('particular', 'empresa', 'recurrente')),
      client_status TEXT NOT NULL DEFAULT 'active' CHECK (client_status IN ('active', 'inactive', 'pending', 'blacklisted')),
      registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_contact_date TIMESTAMPTZ,
      total_purchases DECIMAL(12, 2) DEFAULT 0.00,
      outstanding_balance DECIMAL(12, 2) DEFAULT 0.00,
      credit_limit DECIMAL(12, 2) DEFAULT 0.00,
      tags TEXT[] DEFAULT '{}',
      notes TEXT,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await executeSQL(createTableSQL);
  console.log('✅ crm_clients table created successfully');
}

async function createCRMTagsTable() {
  console.log('🏗️  Creating crm_tags table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS crm_tags (
      id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      firestore_id TEXT UNIQUE NOT NULL,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#6B7280',
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await executeSQL(createTableSQL);
  console.log('✅ crm_tags table created successfully');
}

async function addDefaultTags() {
  console.log('🏷️  Adding default CRM tags...');
  
  const insertTagsSQL = `
    INSERT INTO crm_tags (firestore_id, name, color, description) VALUES
      (gen_random_uuid()::text, 'VIP', '#FFD700', 'Cliente VIP con beneficios especiales'),
      (gen_random_uuid()::text, 'Moroso', '#EF4444', 'Cliente con pagos pendientes'),
      (gen_random_uuid()::text, 'Preferencial', '#10B981', 'Cliente preferencial con descuentos'),
      (gen_random_uuid()::text, 'Nuevo', '#3B82F6', 'Cliente reciente en el negocio'),
      (gen_random_uuid()::text, 'Inactivo', '#6B7280', 'Cliente sin actividad reciente')
    ON CONFLICT (name) DO NOTHING;
  `;

  try {
    await executeSQL(insertTagsSQL);
    console.log('✅ Default tags added successfully');
  } catch (error) {
    console.error('⚠️  Error adding default tags:', error.message);
  }
}

async function enableRLS() {
  console.log('🔒 Enabling Row Level Security...');
  
  const rlsSQL = `
    ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
    
    -- Create RLS policies for crm_clients
    DROP POLICY IF EXISTS "Users can view crm_clients" ON crm_clients;
    DROP POLICY IF EXISTS "Users can insert crm_clients" ON crm_clients;
    DROP POLICY IF EXISTS "Users can update crm_clients" ON crm_clients;
    DROP POLICY IF EXISTS "Users can delete crm_clients" ON crm_clients;
    
    CREATE POLICY "Users can view crm_clients" ON crm_clients
      FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can insert crm_clients" ON crm_clients
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can update crm_clients" ON crm_clients
      FOR UPDATE USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can delete crm_clients" ON crm_clients
      FOR DELETE USING (auth.role() = 'authenticated');
    
    -- Create RLS policies for crm_tags
    DROP POLICY IF EXISTS "Users can view crm_tags" ON crm_tags;
    DROP POLICY IF EXISTS "Users can insert crm_tags" ON crm_tags;
    DROP POLICY IF EXISTS "Users can update crm_tags" ON crm_tags;
    DROP POLICY IF EXISTS "Users can delete crm_tags" ON crm_tags;
    
    CREATE POLICY "Users can view crm_tags" ON crm_tags
      FOR SELECT USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can insert crm_tags" ON crm_tags
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can update crm_tags" ON crm_tags
      FOR UPDATE USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Users can delete crm_tags" ON crm_tags
      FOR DELETE USING (auth.role() = 'authenticated');
  `;

  try {
    await executeSQL(rlsSQL);
    console.log('✅ RLS enabled successfully');
  } catch (error) {
    console.error('⚠️  Error enabling RLS:', error.message);
  }
}

async function createUpdatedAtFunction() {
  console.log('🔧 Creating updated_at function...');
  
  const functionSQL = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    await executeSQL(functionSQL);
    console.log('✅ Updated at function created successfully');
  } catch (error) {
    console.error('⚠️  Error creating function:', error.message);
  }
}

async function createTriggers() {
  console.log('⚙️  Creating triggers...');
  
  const triggersSQL = `
    DROP TRIGGER IF EXISTS update_crm_clients_updated_at ON crm_clients;
    CREATE TRIGGER update_crm_clients_updated_at
      BEFORE UPDATE ON crm_clients
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_crm_tags_updated_at ON crm_tags;
    CREATE TRIGGER update_crm_tags_updated_at
      BEFORE UPDATE ON crm_tags
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await executeSQL(triggersSQL);
    console.log('✅ Triggers created successfully');
  } catch (error) {
    console.error('⚠️  Error creating triggers:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting CRM migration process...');
  
  try {
    // Crear función de actualización
    await createUpdatedAtFunction();
    
    // Verificar y crear tablas
    const clientsExists = await checkIfTableExists('crm_clients');
    const tagsExists = await checkIfTableExists('crm_tags');
    
    if (!clientsExists) {
      await createCRMClientsTable();
    } else {
      console.log('✅ crm_clients table already exists');
    }
    
    if (!tagsExists) {
      await createCRMTagsTable();
    } else {
      console.log('✅ crm_tags table already exists');
    }
    
    // Configurar triggers
    await createTriggers();
    
    // Agregar datos iniciales
    await addDefaultTags();
    
    // Configurar RLS
    await enableRLS();
    
    console.log('🎉 CRM migration completed successfully!');
    console.log('✅ You can now use the CRM functionality');
    console.log('📋 Available tables: crm_clients, crm_tags');
    console.log('🏷️  Default tags added: VIP, Moroso, Preferencial, Nuevo, Inactivo');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };