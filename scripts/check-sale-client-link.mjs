import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSaleLink() {
    console.log('🔍 CHECKING SALE - CLIENT LINK\n');
    console.log('========================================\n');

    // Check 1: Find the client
    console.log('1️⃣  Finding client "antonio mohameht" with cedula 9384932...\n');
    const { data: clients, error: clientError } = await supabase
        .from('crm_clients')
        .select('*')
        .eq('identification_number', '9384932');

    if (clientError) {
        console.log(`❌ Error: ${clientError.message}`);
        return;
    }

    if (clients.length === 0) {
        console.log('❌ Client not found with cedula 9384932');
        return;
    }

    const client = clients[0];
    console.log(`✓ Found client:`);
    console.log(`  ID (DB): ${client.id}`);
    console.log(`  Firestore ID: ${client.firestore_id}`);
    console.log(`  Name: ${client.first_name} ${client.last_name}`);
    console.log(`  Email: ${client.email}`);
    console.log(`  Phone: ${client.phone}`);
    console.log(`  Total Purchases (DB): $${client.total_purchases}`);
    console.log(`  Status: ${client.client_status}\n`);

    // Check 2: Look for sales related to this client
    console.log('2️⃣  Looking for sales in database...\n');

    // Check sales table
    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

    if (salesError) {
        console.log(`⚠️  Sales table error: ${salesError.message}`);
    } else {
        console.log(`✓ Sales found: ${sales.length}`);
        if (sales.length > 0) {
            sales.forEach((sale, i) => {
                console.log(`\n  Sale #${i + 1}:`);
                console.log(`    ID: ${sale.id}`);
                console.log(`    Date: ${sale.created_at}`);
                console.log(`    Total: $${sale.total}`);
                console.log(`    Status: ${sale.status}`);
            });
        }
    }

    // Check 3: Look for interactions
    console.log('\n\n3️⃣  Looking for CRM interactions...\n');
    
    const { data: interactions, error: interactionError } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('client_id', client.id)
        .order('interaction_date', { ascending: false });

    if (interactionError) {
        console.log(`⚠️  Interactions error: ${interactionError.message}`);
    } else {
        console.log(`✓ Interactions found: ${interactions.length}`);
        if (interactions.length > 0) {
            interactions.forEach((interaction, i) => {
                console.log(`\n  Interaction #${i + 1}:`);
                console.log(`    Type: ${interaction.interaction_type}`);
                console.log(`    Date: ${interaction.interaction_date}`);
                console.log(`    Amount: $${interaction.amount || 'N/A'}`);
                console.log(`    Description: ${interaction.description || 'N/A'}`);
            });
        }
    }

    // Check 4: Search by email/phone for any sales
    console.log('\n\n4️⃣  Searching sales by email or phone...\n');

    const { data: salesByEmail, error: emailError } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_email', client.email);

    const { data: salesByPhone, error: phoneError } = await supabase
        .from('sales')
        .select('*')
        .eq('customer_phone', client.phone);

    console.log(`Sales by email "${client.email}": ${salesByEmail?.length || 0}`);
    console.log(`Sales by phone "${client.phone}": ${salesByPhone?.length || 0}`);

    if (salesByEmail && salesByEmail.length > 0) {
        console.log('\n  Sales by email:');
        salesByEmail.forEach((sale, i) => {
            console.log(`    ${i+1}. ID: ${sale.id}, Total: $${sale.total}, Status: ${sale.status}`);
        });
    }

    if (salesByPhone && salesByPhone.length > 0) {
        console.log('\n  Sales by phone:');
        salesByPhone.forEach((sale, i) => {
            console.log(`    ${i+1}. ID: ${sale.id}, Total: $${sale.total}, Status: ${sale.status}`);
        });
    }

    // Check 5: List all sales without client_id filter
    console.log('\n\n5️⃣  Recent sales (last 5):\n');
    
    const { data: allSales, error: allSalesError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (allSalesError) {
        console.log(`⚠️  Error: ${allSalesError.message}`);
    } else {
        console.log(`Total recent sales: ${allSales?.length || 0}`);
        allSales?.forEach((sale, i) => {
            console.log(`\n  Sale #${i + 1}:`);
            console.log(`    ID: ${sale.id}`);
            console.log(`    Client ID: ${sale.client_id}`);
            console.log(`    Customer: ${sale.customer_name}`);
            console.log(`    Email: ${sale.customer_email}`);
            console.log(`    Phone: ${sale.customer_phone}`);
            console.log(`    Total: $${sale.total}`);
            console.log(`    Date: ${sale.created_at}`);
        });
    }

    console.log('\n\n========================================');
    console.log('SUMMARY\n');
    console.log('Issues to investigate:');
    console.log('1. Is sales.client_id being set to the correct value?');
    console.log('2. Should total_purchases be updated when a sale is created?');
    console.log('3. Should a CRM interaction be created automatically for sales?');
    console.log('4. Is there a trigger to link sales to CRM?');
}

checkSaleLink().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
