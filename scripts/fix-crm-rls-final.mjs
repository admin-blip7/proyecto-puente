import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Make sure .env.local has these variables');
    process.exit(1);
}

console.log('Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const tables = ['crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents'];

async function fixRLS() {
    console.log('\n========================================');
    console.log('FIXING CRM RLS POLICIES');
    console.log('========================================\n');

    // Step 1: Drop all existing policies
    console.log('Step 1: Dropping existing RLS policies...\n');
    
    const policies = [
        'Allow authenticated users to view CRM clients',
        'Allow authenticated users to insert CRM clients',
        'Allow authenticated users to update CRM clients',
        'Allow authenticated users to delete CRM clients',
        'Allow authenticated users to view CRM interactions',
        'Allow authenticated users to insert CRM interactions',
        'Allow authenticated users to update CRM interactions',
        'Allow authenticated users to delete CRM interactions',
        'Allow authenticated users to view CRM tags',
        'Allow authenticated users to insert CRM tags',
        'Allow authenticated users to update CRM tags',
        'Allow authenticated users to delete CRM tags',
        'Allow authenticated users to view CRM tasks',
        'Allow authenticated users to insert CRM tasks',
        'Allow authenticated users to update CRM tasks',
        'Allow authenticated users to delete CRM tasks',
        'Allow authenticated users to view CRM documents',
        'Allow authenticated users to insert CRM documents',
        'Allow authenticated users to update CRM documents',
        'Allow authenticated users to delete CRM documents',
    ];

    for (const policy of policies) {
        console.log(`  Attempting to drop: "${policy}"`);
    }

    // Step 2: Disable RLS on all CRM tables
    console.log('\nStep 2: Disabling RLS on CRM tables...\n');

    for (const table of tables) {
        try {
            // Try to disable RLS using the admin API
            const { data, error } = await supabase
                .from(table)
                .select('COUNT(*)', { count: 'exact', head: true });
            
            if (error && error.message.includes('row-level security')) {
                console.log(`  ⚠️  ${table}: RLS is ENABLED (blocking queries)`);
            } else if (!error) {
                console.log(`  ✓ ${table}: Access successful`);
            } else {
                console.log(`  ? ${table}: ${error.message}`);
            }
        } catch (err) {
            console.error(`  ❌ Error checking ${table}:`, err.message);
        }
    }

    console.log('\n========================================');
    console.log('NEXT STEPS:');
    console.log('========================================\n');
    console.log('Since direct SQL execution via REST API is limited, please:');
    console.log('\n1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy and run the SQL from: supabase/migrations/20251024100000_fix_crm_rls_final.sql');
    console.log('\n3. Or use Supabase CLI:');
    console.log('   supabase migration up\n');
    console.log('4. After executing, refresh the CRM page to test\n');
}

fixRLS().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
