
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkSales() {
    console.log("Checking sales for Feb 2nd 2026...");

    // 02 Feb 2026 
    const startOfDay = new Date('2026-02-02T00:00:00');
    const endOfDay = new Date('2026-02-02T23:59:59');

    const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

    if (error) {
        console.error("Error fetching sales:", error);
        return;
    }

    console.log(`Found ${sales?.length} sales for Feb 2nd 2026.`);
    if (sales && sales.length > 0) {
        const total = sales.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
        console.log(`Total Amount: ${total}`);
        console.log("Sample ID:", sales[0].id);
        console.log("Sample Time:", sales[0].created_at);
    }
}

checkSales();
