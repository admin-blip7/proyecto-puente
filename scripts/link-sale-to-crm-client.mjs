import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function linkSaleToCRMClient() {
    console.log('🔗 LINKING SALE TO CRM CLIENT\n');
    console.log('========================================\n');

    // Step 1: Find the client
    console.log('1️⃣  Finding CRM client...\n');
    const { data: clients, error: clientError } = await supabase
        .from('crm_clients')
        .select('*')
        .eq('identification_number', '9384932');

    if (clientError || !clients || clients.length === 0) {
        console.log('❌ Client not found');
        return;
    }

    const client = clients[0];
    console.log(`✓ Found: ${client.first_name} ${client.last_name}`);
    console.log(`  Phone: ${client.phone}`);
    console.log(`  Email: ${client.email}\n`);

    // Step 2: Find recent sales
    console.log('2️⃣  Finding recent sales...\n');
    
    const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (salesError || !sales || sales.length === 0) {
        console.log('❌ No sales found');
        return;
    }

    console.log(`Found ${sales.length} recent sales:\n`);
    sales.forEach((sale, i) => {
        console.log(`${i + 1}. Sale ID: ${sale.id}`);
        console.log(`   Customer: ${sale.customerName || 'Sin nombre'}`);
        console.log(`   Phone: ${sale.customerPhone || 'Sin teléfono'}`);
        console.log(`   Amount: $${sale.totalAmount}`);
        console.log(`   Date: ${sale.updated_at}\n`);
    });

    // Step 3: Find sale that matches the client (by phone or customer name)
    console.log('3️⃣  Matching sales to client...\n');
    
    const matchingSales = sales.filter(sale => 
        (sale.customerPhone === client.phone) ||
        (sale.customerPhone && client.phone && sale.customerPhone.includes(client.phone.slice(-7))) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(client.first_name.toLowerCase()))
    );

    if (matchingSales.length === 0) {
        console.log('❌ No matching sales found');
        console.log('\nManual linking required:');
        console.log(`Add to the most recent sale:\n`);
        console.log('- customer_name: "antonio mohameht"');
        console.log('- customer_phone: "7411002132"');
        console.log('- customer_email: "139403@gmail.com"');
        return;
    }

    console.log(`✓ Found ${matchingSales.length} matching sale(s):\n`);

    // Step 4: Create CRM Interaction for the sale
    console.log('4️⃣  Creating CRM interaction for the sale...\n');

    for (const sale of matchingSales) {
        try {
            const { data: interaction, error: interactionError } = await supabase
                .from('crm_interactions')
                .insert({
                    firestore_id: `interaction-${sale.id}`,
                    client_id: client.id,
                    interaction_type: 'sale',
                    interaction_date: new Date().toISOString(),
                    amount: sale.totalAmount,
                    description: `Sale: ${sale.saleId || sale.id}`,
                    related_id: sale.firestore_id,
                    related_table: 'sales',
                    status: 'completed'
                })
                .select()
                .single();

            if (interactionError) {
                console.log(`❌ Error creating interaction: ${interactionError.message}`);
            } else {
                console.log(`✓ Created CRM interaction for sale ${sale.id}`);
            }
        } catch (err) {
            console.log(`❌ Error: ${err.message}`);
        }
    }

    // Step 5: Update client total_purchases
    console.log('\n5️⃣  Updating client total_purchases...\n');

    try {
        const saleTotal = matchingSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const newTotal = (client.total_purchases || 0) + saleTotal;

        const { data: updated, error: updateError } = await supabase
            .from('crm_clients')
            .update({
                total_purchases: newTotal,
                last_contact_date: new Date().toISOString()
            })
            .eq('id', client.id)
            .select()
            .single();

        if (updateError) {
            console.log(`❌ Error updating client: ${updateError.message}`);
        } else {
            console.log(`✓ Updated client total_purchases`);
            console.log(`  Previous: $${client.total_purchases || 0}`);
            console.log(`  New: $${newTotal}`);
            console.log(`  Sale amount: $${saleTotal}`);
        }
    } catch (err) {
        console.log(`❌ Error: ${err.message}`);
    }

    console.log('\n========================================');
    console.log('✅ Linking complete!\n');
}

linkSaleToCRMClient().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
