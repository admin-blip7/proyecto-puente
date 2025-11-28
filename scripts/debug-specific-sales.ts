
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

async function debugSpecificSales() {
    const saleIds = ['SALE-CBCA8E6D', 'SALE-41EC3801'];

    console.log('--- Fetching Sales ---');
    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .in('saleId', saleIds);

    if (salesError) {
        console.error('Error fetching sales:', salesError);
        return;
    }

    sales?.forEach(sale => {
        console.log(`Sale: ${sale.saleId}`);
        console.log(`  ID: ${sale.id}`);
        console.log(`  SessionID: ${sale.sessionId}`);
        console.log(`  CashierID: ${sale.cashierId}`);
        console.log(`  CreatedAt: ${sale.createdAt}`);
        console.log(`  PaymentMethod: ${sale.paymentMethod}`);
        console.log('-------------------');
    });

    console.log('\n--- Fetching Active Session ---');
    // Assuming the user is the cashier for these sales
    const cashierId = sales?.[0]?.cashierId;
    if (!cashierId) {
        console.log('No cashier ID found in sales to look up session.');
        return;
    }

    const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('openedBy', cashierId)
        .eq('status', 'Abierto')
        .order('openedAt', { ascending: false })
        .limit(1)
        .single();

    if (sessionError) {
        console.error('Error fetching session:', sessionError);
    } else if (session) {
        console.log(`Session: ${session.sessionId}`);
        console.log(`  FirestoreID: ${session.firestore_id}`);
        console.log(`  OpenedBy: ${session.openedBy}`);
        console.log(`  OpenedAt: ${session.openedAt}`);
        console.log(`  Status: ${session.status}`);
    } else {
        console.log('No active session found for this cashier.');
    }
}

debugSpecificSales();
