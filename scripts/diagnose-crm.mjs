import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    console.log('🔍 CRM DIAGNOSTICS\n');
    console.log('========================================\n');

    // Check 1: Table existence
    console.log('1️⃣  Checking CRM tables existence...');
    try {
        const tables = ['crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents'];
        
        for (const table of tables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.log(`   ❌ ${table}: ${error.message}`);
            } else {
                console.log(`   ✓ ${table}: Accessible (${count} rows)`);
            }
        }
    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
    }

    console.log('\n2️⃣  Checking CRM clients data...');
    try {
        const { data, error, status } = await supabase
            .from('crm_clients')
            .select('*')
            .limit(5);
        
        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
            console.log(`   Status: ${status}`);
        } else {
            console.log(`   ✓ Found ${data.length} clients`);
            if (data.length > 0) {
                console.log(`   Sample: ${JSON.stringify(data[0], null, 2)}`);
            }
        }
    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
    }

    console.log('\n3️⃣  Checking RLS status...');
    try {
        const { data: schemaData, error } = await supabase
            .rpc('get_policies', { table_name: 'crm_clients' })
            .catch(() => ({ data: null, error: 'RPC not available' }));
        
        if (error) {
            console.log(`   ⚠️  Could not check RLS via RPC: ${error}`);
            console.log(`   Run manually: SELECT * FROM pg_policies WHERE tablename = 'crm_clients';`);
        } else {
            console.log(`   ✓ Policies: ${schemaData?.length || 0}`);
        }
    } catch (err) {
        console.log(`   ⚠️  Error: ${err.message}`);
    }

    console.log('\n4️⃣  Checking CRM tags (default data)...');
    try {
        const { data, count, error } = await supabase
            .from('crm_tags')
            .select('*', { count: 'exact' });
        
        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   ✓ Tags: ${count} found`);
            if (data && data.length > 0) {
                data.forEach(tag => {
                    console.log(`      - ${tag.name} (${tag.color})`);
                });
            }
        }
    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
    }

    console.log('\n5️⃣  Checking authentication...');
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else if (session) {
            console.log(`   ✓ Authenticated as: ${session.user.email}`);
        } else {
            console.log(`   ⚠️  No active session`);
        }
    } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
    }

    console.log('\n========================================');
    console.log('✅ Diagnostics complete\n');
}

diagnose().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
