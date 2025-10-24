#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Make sure your .env file has these variables configured.');
  process.exit(1);
}

async function checkCRMTables() {
  console.log('🔍 Checking CRM tables in Supabase...\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const tablesToCheck = [
    'crm_clients',
    'crm_interactions',
    'crm_tags',
    'crm_tasks',
    'crm_documents'
  ];

  try {
    // Check each table by attempting to query it
    const results = {};
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows, which is fine
          throw error;
        }
        results[table] = 'EXISTS ✓';
      } catch (err) {
        if (err.message && err.message.includes('Could not find the table')) {
          results[table] = 'MISSING ✗';
        } else {
          results[table] = `ERROR: ${err.message}`;
        }
      }
    }

    console.log('Table Status:');
    console.log('─'.repeat(40));
    
    let allExists = true;
    for (const [table, status] of Object.entries(results)) {
      console.log(`${table.padEnd(20)} ${status}`);
      if (status !== 'EXISTS ✓') {
        allExists = false;
      }
    }
    
    console.log('─'.repeat(40));
    
    if (allExists) {
      console.log('\n✅ All CRM tables exist! The system should work correctly.\n');
      process.exit(0);
    } else {
      console.log('\n❌ Some CRM tables are missing!\n');
      console.log('To fix this, you need to apply the CRM migrations.');
      console.log('\nOptions:');
      console.log('1. Read: APPLY_CRM_MIGRATIONS.md for manual instructions');
      console.log('2. Use Supabase Dashboard SQL Editor');
      console.log('3. Run: supabase db push (if using Supabase CLI)\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    process.exit(1);
  }
}

checkCRMTables();
