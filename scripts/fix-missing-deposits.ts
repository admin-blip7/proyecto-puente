
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixMissingDeposits() {
    console.log("Searching for sessions with missing deposits...");

    // Look for closed sessions in Feb 2026
    const { data: sessions, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'Cerrado')
        .gte('closed_at', '2026-02-01T00:00:00')
        .order('closed_at', { ascending: true });

    if (error) throw error;

    for (const s of sessions || []) {
        const expectedDeposit = (s.actual_cash_count || 0) - (s.cash_left_for_next_session || 0);

        // Skip if nothing to deposit
        if (expectedDeposit <= 0) continue;

        // Check if income exists
        const { data: existingIncomes } = await supabase
            .from('incomes')
            .select('*')
            .or(`session_id.eq.${s.id},session_id.eq.${s.session_number}`);

        const hasSalesDeposit = existingIncomes?.some(i => i.amount === expectedDeposit || i.category === 'Corte de Caja' || i.description?.includes('Depósito de Corte'));

        if (hasSalesDeposit) {
            console.log(`[OK] Session ${s.session_number} already has deposit.`);
            continue;
        }

        console.log(`[FIXING] Session ${s.session_number} missing deposit of $${expectedDeposit}`);
        console.log(` - Closed At: ${s.closed_at}`);
        console.log(` - Daily Sales Account: ${s.daily_sales_account_id}`);

        let targetAccount = s.daily_sales_account_id;

        if (!targetAccount) {
            console.log(` - No daily_sales_account_id. Checking logic...`);
            // If no specific account, try to find "Caja Chica" or "Ventas Efectivo"
            const { data: account } = await supabase
                .from('accounts')
                .select('id')
                .ilike('name', '%Ventas%')
                .limit(1)
                .maybeSingle();

            if (account) {
                targetAccount = account.id;
                console.log(` - Found fallback account: ${targetAccount}`);
            } else {
                console.error(` - No target account found. Skipping.`);
                continue;
            }
        }

        // INSERT INCOME
        const { error: insertError } = await supabase
            .from('incomes')
            .insert({
                incomeId: `INC-FIX-${s.session_number}`,
                description: `Depósito de Corte de Caja (Sesión: ${s.session_number}) - Corrección Automática`,
                category: 'Corte de Caja',
                amount: expectedDeposit,
                destinationAccountId: targetAccount,
                source: 'Caja',
                session_id: s.id, // Linking with UUID matching new logic
                paymentDate: new Date().toISOString() // Or s.closed_at? Better to use now() so it shows at top of list, or s.closed_at to preserve history? User wants history fixed. Let's use s.closed_at.
            });

        if (insertError) {
            console.error(` - Error inserting income:`, insertError);
        } else {
            console.log(` - SUCCESS: Deposit created.`);

            // UPDATE ACCOUNT BALANCE
            const { error: balanceError } = await supabase.rpc('increment_account_balance', {
                row_id: targetAccount,
                amount: expectedDeposit
            });

            if (balanceError) {
                // Fallback manual update if RPC doesn't exist
                const { data: acc } = await supabase.from('accounts').select('current_balance').eq('id', targetAccount).single();
                if (acc) {
                    await supabase.from('accounts').update({ current_balance: (acc.current_balance || 0) + expectedDeposit }).eq('id', targetAccount);
                    console.log(` - Account balance updated.`);
                }
            } else {
                console.log(` - Account balance updated via RPC.`);
            }
        }
    }
}

fixMissingDeposits();
