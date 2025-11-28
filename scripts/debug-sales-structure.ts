
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSales() {
    console.log('Fetching latest sale...');
    const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching sales:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No sales found.');
        return;
    }

    console.log('Latest sale structure:', JSON.stringify(data[0], null, 2));
}

debugSales();
