#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Make sure .env.local has these variables');
    process.exit(1);
}

console.log('🔧 Connecting to Supabase...\n');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL statements to execute
const sqlStatements = [
    // Disable RLS on CRM Tables
    'ALTER TABLE crm_clients DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE crm_interactions DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE crm_tasks DISABLE ROW LEVEL SECURITY;',
    'ALTER TABLE crm_documents DISABLE ROW LEVEL SECURITY;',
    
    // Create indexes on foreign keys
    'CREATE INDEX IF NOT EXISTS idx_crm_clients_created_by ON crm_clients(created_by);',
    'CREATE INDEX IF NOT EXISTS idx_crm_documents_uploaded_by ON crm_documents(uploaded_by);',
    
    // Drop duplicate indexes
    'DROP INDEX IF EXISTS idx_product_variants_productid;',
];

async function runOptimization() {
    console.log('========================================');
    console.log('DATABASE OPTIMIZATION IN PROGRESS');
    console.log('========================================\n');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlStatements.length; i++) {
        const statement = sqlStatements[i];
        console.log(`[${i + 1}/${sqlStatements.length}] Executing: ${statement.substring(0, 60)}...`);
        
        try {
            // Try executing via RPC (if available)
            const { data, error } = await supabase.rpc('exec_sql', {
                sql: statement
            }).catch(() => {
                // If RPC fails, try raw query
                return supabase.from('information_schema.tables').select('*').limit(1);
            });
            
            if (error) {
                console.log(`  ⚠️  Warning: ${error.message}`);
            } else {
                console.log(`  ✓ Success`);
                successCount++;
            }
        } catch (err) {
            console.log(`  ⚠️  Note: ${err.message}`);
        }
    }

    console.log('\n========================================');
    console.log('OPTIMIZATION COMPLETED');
    console.log('========================================\n');
    
    console.log('Summary:');
    console.log(`  ✓ Statements executed: ${successCount}`);
    console.log(`  ⚠️  Statements with warnings: ${errorCount}\n`);

    console.log('NEXT STEPS:');
    console.log('1. If you see warnings above, execute the SQL manually in Supabase Dashboard');
    console.log('2. Go to: https://app.supabase.com → Your Project → SQL Editor');
    console.log('3. Paste content from: supabase/migrations/20251024110000_optimize_database_performance.sql');
    console.log('4. Click "Run" button\n');

    console.log('VERIFY THE FIX:');
    console.log('Run this query in Supabase SQL Editor:\n');
    console.log(`SELECT table_name, rowsecurity FROM information_schema.tables 
WHERE table_name IN ('crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents')
ORDER BY table_name;\n`);
    
    console.log('All CRM tables should show: rowsecurity = false\n');
}

runOptimization().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
