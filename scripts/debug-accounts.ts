import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccounts() {
    console.log('Fetching accounts...');
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*');

    if (error) {
        console.error('Error fetching accounts:', error);
        return;
    }

    console.log(`Found ${accounts.length} accounts:`);
    accounts.forEach(acc => {
        console.log(`- Name: ${acc.name}, ID: ${acc.id}, Firestore ID: ${acc.firestore_id}, Balance: ${acc.current_balance}`);
    });
}

checkAccounts();
