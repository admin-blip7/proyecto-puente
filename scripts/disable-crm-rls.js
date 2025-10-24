import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = ['crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents'];

async function disableRLS() {
    console.log('Disabling RLS on CRM tables...\n');
    
    for (const table of tables) {
        try {
            const { data, error } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
            });
            
            if (error) {
                console.error(`Error disabling RLS on ${table}:`, error.message);
            } else {
                console.log(`✓ RLS disabled on ${table}`);
            }
        } catch (err) {
            console.error(`Error disabling RLS on ${table}:`, err);
        }
    }
    
    // Also check the current RLS status
    console.log('\nChecking RLS status...\n');
    try {
        const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name, rowsecurity')
            .in('table_name', tables);
            
        if (!error && data) {
            data.forEach(row => {
                console.log(`${row.table_name}: RLS ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
            });
        }
    } catch (err) {
        console.log('Could not verify RLS status via REST API');
    }
    
    console.log('\nDisabling RLS complete.');
}

disableRLS();
