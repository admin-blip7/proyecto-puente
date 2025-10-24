#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) throw error;
    return data;
  } catch (err) {
    // If exec_sql function doesn't exist, try using the SQL API directly
    console.log('Attempting direct SQL execution...');
    try {
      const response = await supabase.schema('public');
      // This won't work - we need a different approach
      throw new Error('Direct SQL execution not supported via REST API');
    } catch (e) {
      throw err;
    }
  }
}

async function applyMigrations() {
  console.log('Starting CRM migrations...');
  
  const migrationDir = path.join(__dirname, '../supabase/migrations');
  const crmMigrationFile = path.join(migrationDir, '20251024053805_create_crm_tables_v2.sql');

  if (!fs.existsSync(crmMigrationFile)) {
    console.error(`Migration file not found: ${crmMigrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(crmMigrationFile, 'utf-8');
  
  console.log('Executing CRM migration SQL...');
  
  try {
    // For Supabase, we need to use the admin API or a direct connection
    // Since we're using the service role key, we should have admin access
    
    // Split SQL by statements (simple approach - just by semicolon)
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Found ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);
      
      try {
        const result = await executeSql(statement);
        console.log(`✓ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`✗ Error executing statement ${i + 1}:`);
        console.error(err.message);
        if (err.message.includes('already exists') || err.message.includes('IF NOT EXISTS')) {
          console.log('  (Continuing - likely duplicate objects)');
        } else {
          throw err;
        }
      }
    }
    
    console.log('\n✓ CRM migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error applying migrations:', error.message);
    console.error('\nNote: The REST API doesn\'t support executing raw SQL directly.');
    console.error('Please execute the migration manually using one of these methods:');
    console.error('1. Supabase Dashboard: SQL Editor > New Query > Paste the SQL');
    console.error('2. psql: psql -h [host] -U postgres -d postgres < migration.sql');
    console.error(`3. Migration file: ${crmMigrationFile}`);
    process.exit(1);
  }
}

applyMigrations();
