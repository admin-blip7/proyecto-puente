
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

async function debugExpenses() {
    console.log('Fetching latest expense...');
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('paymentDate', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching expenses:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No expenses found.');
        return;
    }

    console.log('Latest expense structure:', JSON.stringify(data[0], null, 2));
}

debugExpenses();
