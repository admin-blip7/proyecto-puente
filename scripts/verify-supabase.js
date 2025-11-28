const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.log('Please make sure you have created .env.local and added your credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
    console.log('Testing Supabase connection...');
    try {
        const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Connection failed:', error.message);
        } else {
            console.log('✅ Connection successful!');
            console.log('Supabase URL:', supabaseUrl);
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
    }
}

verifyConnection();
