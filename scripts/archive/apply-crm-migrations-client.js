// Script para aplicar migraciones CRM usando el cliente de Supabase directamente
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkIfTableExists(tableName) {
  try {
    console.log(`🔍 Checking if table ${tableName} exists...`);
    
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .limit(1);

    if (error) {
      console.log(`⚠️  Could not check table ${tableName}:`, error.message);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.log(`⚠️  Error checking table ${tableName}:`, error.message);
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

  try {
    const { error } = await supabase.rpc('db_create', { sql: createTableSQL });
    if (error) throw error;
    console.log('✅ crm_clients table created successfully');
  } catch (error) {
    console.error('❌ Error creating crm_clients table:', error.message);
    throw error;
  }
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

  try {
    const { error } = await supabase.rpc('db_create', { sql: createTableSQL });
    if (error) throw error;
    console.log('✅ crm_tags table created successfully');
  } catch (error) {
    console.error('❌ Error creating crm_tags table:', error.message);
    throw error;
  }
}

async function addDefaultTags() {
  console.log('🏷️  Adding default CRM tags...');
  
  try {
    const tags = [
      { firestore_id: require('crypto').randomUUID(), name: 'VIP', color: '#FFD700', description: 'Cliente VIP con beneficios especiales' },
      { firestore_id: require('crypto').randomUUID(), name: 'Moroso', color: '#EF4444', description: 'Cliente con pagos pendientes' },
      { firestore_id: require('crypto').randomUUID(), name: 'Preferencial', color: '#10B981', description: 'Cliente preferencial con descuentos' },
      { firestore_id: require('crypto').randomUUID(), name: 'Nuevo', color: '#3B82F6', description: 'Cliente reciente en el negocio' },
      { firestore_id: require('crypto').randomUUID(), name: 'Inactivo', color: '#6B7280', description: 'Cliente sin actividad reciente' }
    ];

    const { error } = await supabase
      .from('crm_tags')
      .insert(tags)
      .select();

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
    
    console.log('✅ Default tags added successfully');
  } catch (error) {
    console.error('⚠️  Error adding default tags:', error.message);
  }
}

async function enableRLS() {
  console.log('🔒 Enabling Row Level Security...');
  
  try {
    // Enable RLS on tables
    const { error: rlsError } = await supabase.rpc('db_alter', {
      sql: `
        ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
        ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
      `
    });

    if (rlsError) throw rlsError;

    // Create RLS policies for crm_clients
    const { error: policyError1 } = await supabase.rpc('db_alter', {
      sql: `
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
      `
    });

    if (policyError1) throw policyError1;

    // Create RLS policies for crm_tags
    const { error: policyError2 } = await supabase.rpc('db_alter', {
      sql: `
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
      `
    });

    if (policyError2) throw policyError2;

    console.log('✅ RLS enabled successfully');
  } catch (error) {
    console.error('⚠️  Error enabling RLS:', error.message);
  }
}

async function createUpdatedAtFunction() {
  console.log('🔧 Creating updated_at function...');
  
  try {
    const functionSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error } = await supabase.rpc('db_create', { sql: functionSQL });
    if (error) throw error;
    console.log('✅ Updated at function created successfully');
  } catch (error) {
    console.error('⚠️  Error creating function:', error.message);
  }
}

async function createTriggers() {
  console.log('⚙️  Creating triggers...');
  
  try {
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

    const { error } = await supabase.rpc('db_alter', { sql: triggersSQL });
    if (error) throw error;
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