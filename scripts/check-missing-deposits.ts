
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listSessions() {
    console.log("Listing closed sessions for Feb 2-3 2026...");

    const startDate = new Date('2026-02-02T00:00:00');
    const endDate = new Date('2026-02-04T00:00:00'); // Until start of Feb 4

    const { data: sessions, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'Cerrado')
        .gte('closed_at', startDate.toISOString())
        .lte('closed_at', endDate.toISOString())
        .order('closed_at', { ascending: true });

    if (error) {
        console.error("Error fetching sessions:", error);
        return;
    }

    console.log(`Found ${sessions?.length} sessions.`);
    for (const s of sessions || []) {
        console.log(`--------------------------------`);
        console.log(`Session: ${s.session_number} (${s.id})`);
        console.log(`Closed At: ${s.closed_at}`);
        console.log(`Actual Cash: ${s.actual_cash_count}`);
        console.log(`Left Next: ${s.cash_left_for_next_session}`);
        console.log(`Daily Sales Acc: ${s.daily_sales_account_id}`);

        // Expected Deposit
        const expectedDeposit = (s.actual_cash_count || 0) - (s.cash_left_for_next_session || 0);
        console.log(`Expected Deposit: ${expectedDeposit}`);

        // Check if income exists
        const { data: income } = await supabase
            .from('incomes')
            .select('*')
            .eq('session_id', s.session_number); // older logic used session_number, newer might use UUID. Check both.

        const { data: incomeUUID } = await supabase
            .from('incomes')
            .select('*')
            .eq('session_id', s.id);

        const incomesFound = [...(income || []), ...(incomeUUID || [])];
        console.log(`Incomes found: ${incomesFound.length}`);
        incomesFound.forEach(i => console.log(` - Income: ${i.amount} (${i.description})`));
    }
}

listSessions();
