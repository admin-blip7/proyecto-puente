import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data, error } = await supabase.rpc('get_table_columns_by_name', { table_name: 'inventory_logs' }).limit(10);
    if (error) {
        console.log("RPC get_table_columns_by_name failed, trying direct select");
        const { data: qData, error: qErr } = await supabase.from('inventory_logs').select('*').limit(1);
        console.log("Direct select error:", qErr);
    } else {
        console.log(data);
    }
}
check();
