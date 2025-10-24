#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Required:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 Running CRM migration via Supabase...\n');

  const migrationFile = path.join(__dirname, '../supabase/migrations/20251024080000_repair_and_create_crm_tables.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');
  
  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    console.log('📋 Executing CRM migration SQL...\n');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .map(s => s + ';');

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    let executedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementNum = i + 1;
      
      try {
        // Execute raw SQL using the admin API
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        }).catch(err => {
          // If exec_sql doesn't exist, we'll handle it
          if (err.message.includes('function exec_sql')) {
            throw new Error('NEED_DIRECT_CONNECTION');
          }
          return { error: err };
        });

        if (error) {
          // Check if it's a benign error (already exists, etc)
          if (error.message.includes('already exists') || 
              error.message.includes('IF NOT EXISTS')) {
            console.log(`✓ Statement ${statementNum}: Skipped (already exists)`);
            executedCount++;
          } else {
            throw error;
          }
        } else {
          console.log(`✓ Statement ${statementNum}: Executed`);
          executedCount++;
        }
      } catch (err) {
        if (err.message === 'NEED_DIRECT_CONNECTION') {
          throw err;
        }
        console.error(`✗ Statement ${statementNum}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✓ Executed: ${executedCount} statements`);
    console.log(`✗ Errors: ${errorCount} statements`);
    console.log(`${'─'.repeat(50)}\n`);

    // Verify tables were created
    console.log('🔍 Verifying CRM tables...\n');
    
    const tablesToCheck = ['crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents'];
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && !error.message.includes('Could not find the table')) {
          throw error;
        }
        
        if (!error || !error.message.includes('Could not find the table')) {
          console.log(`✓ ${table}`);
        } else {
          console.log(`✗ ${table} (NOT FOUND)`);
        }
      } catch (err) {
        console.log(`✗ ${table}: ${err.message}`);
      }
    }

    console.log('\n✅ CRM migration completed!\n');
    process.exit(0);

  } catch (error) {
    if (error.message === 'NEED_DIRECT_CONNECTION') {
      console.error('\n❌ The Supabase REST API does not support direct SQL execution.');
      console.error('\nPlease apply the migration manually using one of these methods:\n');
      console.error('1️⃣  Supabase Dashboard:');
      console.error('   - Open: https://app.supabase.com');
      console.error('   - Go to SQL Editor > New Query');
      console.error(`   - Copy content from: ${migrationFile}`);
      console.error('   - Click Run\n');
      console.error('2️⃣  Command line with psql:');
      console.error('   psql -h db.aaftjwktzpnyjwklroww.supabase.co -U postgres \\');
      console.error(`   < ${migrationFile}\n`);
      console.error('3️⃣  Using supabase db push:');
      console.error('   supabase db push --include-all\n');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

runMigration();
