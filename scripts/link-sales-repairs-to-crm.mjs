import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function linkSalesAndRepairsToCRM() {
    console.log('🔗 LINKING SALES & REPAIRS TO CRM CLIENT\n');
    console.log('========================================\n');

    // Step 1: Find the client
    console.log('1️⃣  Finding CRM client: antonio mohameht (cedula: 9384932)...\n');
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
    console.log(`  Email: ${client.email}`);
    console.log(`  Current total_purchases: $${client.total_purchases}\n`);

    // Step 2: Find sales
    console.log('2️⃣  Searching for sales linked to this client...\n');
    
    const { data: allSales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);

    if (salesError) {
        console.log(`⚠️  Error reading sales: ${salesError.message}`);
    } else if (!allSales || allSales.length === 0) {
        console.log('No sales found');
    } else {
        const matchingSales = allSales.filter(sale => 
            (sale.customerPhone === client.phone) ||
            (sale.customerPhone && client.phone && sale.customerPhone.includes(client.phone.slice(-7))) ||
            (sale.customerName && sale.customerName.toLowerCase().includes(client.first_name.toLowerCase())) ||
            (sale.customerName && sale.customerName.toLowerCase().includes(client.last_name.toLowerCase()))
        );

        console.log(`Found ${matchingSales.length} matching sale(s):\n`);
        
        let totalSalesAmount = 0;
        for (const sale of matchingSales) {
            try {
                console.log(`  Processing sale: ${sale.id}`);
                console.log(`    Amount: $${sale.totalAmount}`);
                
                // Create CRM interaction
                const { data: interaction, error: interactionError } = await supabase
                    .from('crm_interactions')
                    .insert({
                        firestore_id: `interaction-sale-${sale.id}`,
                        client_id: client.id,
                        interaction_type: 'sale',
                        interaction_date: sale.updated_at || new Date().toISOString(),
                        amount: sale.totalAmount,
                        description: `Sale: ${sale.saleId || sale.id}`,
                        related_id: sale.firestore_id,
                        related_table: 'sales',
                        status: 'completed'
                    })
                    .select()
                    .single();

                if (interactionError) {
                    console.log(`    ❌ Error: ${interactionError.message}`);
                } else {
                    console.log(`    ✓ Created CRM interaction`);
                    totalSalesAmount += sale.totalAmount;
                }
            } catch (err) {
                console.log(`    ❌ Error: ${err.message}`);
            }
        }
        console.log(`\n  Total sales amount: $${totalSalesAmount}\n`);
    }

    // Step 3: Find repairs
    console.log('3️⃣  Searching for repairs linked to this client...\n');
    
    let totalRepairsAmount = 0;
    const repairsTables = ['repair_orders', 'repairs'];
    
    for (const tableName of repairsTables) {
        try {
            const { data: repairs, error: repairsError } = await supabase
                .from(tableName)
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(20);

            if (repairsError) {
                console.log(`⚠️  Table "${tableName}": Not found or error - ${repairsError.message}`);
                continue;
            }

            if (!repairs || repairs.length === 0) {
                console.log(`  "${tableName}": No records found`);
                continue;
            }

            console.log(`  Found ${repairs.length} records in "${tableName}"\n`);

            const matchingRepairs = repairs.filter(repair => 
                (repair.customer_phone === client.phone) ||
                (repair.customer_phone && client.phone && repair.customer_phone.includes(client.phone.slice(-7))) ||
                (repair.customerPhone === client.phone) ||
                (repair.customerPhone && client.phone && repair.customerPhone.includes(client.phone.slice(-7))) ||
                (repair.customer_name && repair.customer_name.toLowerCase().includes(client.first_name.toLowerCase())) ||
                (repair.customerName && repair.customerName.toLowerCase().includes(client.first_name.toLowerCase())) ||
                (repair.customer_email === client.email) ||
                (repair.customerEmail === client.email)
            );

            console.log(`  Matching repairs: ${matchingRepairs.length}\n`);

            for (const repair of matchingRepairs) {
                try {
                    console.log(`    Processing repair: ${repair.id}`);
                    const repairAmount = repair.total_price || repair.totalPrice || repair.cost || 0;
                    console.log(`    Amount: $${repairAmount}`);

                    // Create CRM interaction
                    const { data: interaction, error: interactionError } = await supabase
                        .from('crm_interactions')
                        .insert({
                            firestore_id: `interaction-repair-${repair.id}`,
                            client_id: client.id,
                            interaction_type: 'repair',
                            interaction_date: repair.updated_at || repair.created_at || new Date().toISOString(),
                            amount: repairAmount,
                            description: `Repair: ${repair.id}`,
                            related_id: repair.firestore_id || repair.id,
                            related_table: tableName,
                            status: repair.status || 'completed'
                        })
                        .select()
                        .single();

                    if (interactionError) {
                        console.log(`    ❌ Error: ${interactionError.message}`);
                    } else {
                        console.log(`    ✓ Created CRM interaction`);
                        totalRepairsAmount += repairAmount;
                    }
                } catch (err) {
                    console.log(`    ❌ Error: ${err.message}`);
                }
            }
        } catch (err) {
            console.log(`⚠️  Error accessing table "${tableName}": ${err.message}`);
        }
    }

    console.log(`\n  Total repairs amount: $${totalRepairsAmount}\n`);

    // Step 4: Update client total_purchases and outstanding_balance
    console.log('4️⃣  Updating client totals...\n');

    try {
        // Only count matching sales, not all sales
        const matchingSales = (allSales || []).filter(sale => 
            (sale.customerPhone === client.phone) ||
            (sale.customerPhone && client.phone && sale.customerPhone.includes(client.phone.slice(-7))) ||
            (sale.customerName && sale.customerName.toLowerCase().includes(client.first_name.toLowerCase())) ||
            (sale.customerName && sale.customerName.toLowerCase().includes(client.last_name.toLowerCase()))
        );
        
        const salesTotal = matchingSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalAmount = salesTotal + totalRepairsAmount;
        const newTotal = (client.total_purchases || 0) + totalAmount;

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
            console.log(`✓ Updated client totals:`);
            console.log(`  Previous total_purchases: $${client.total_purchases || 0}`);
            console.log(`  New total_purchases: $${newTotal}`);
            console.log(`  Total linked amount: $${totalAmount}\n`);
        }
    } catch (err) {
        console.log(`❌ Error: ${err.message}\n`);
    }

    console.log('========================================');
    console.log('✅ Linking complete!\n');
    console.log('Summary:');
    console.log(`- Sales linked: ${allSales ? allSales.filter(s => 
        (s.customerPhone === client.phone) ||
        (s.customerPhone && client.phone && s.customerPhone.includes(client.phone.slice(-7))) ||
        (s.customerName && s.customerName.toLowerCase().includes(client.first_name.toLowerCase()))
    ).length : 0}`);
    console.log(`- Repairs linked: ${totalRepairsAmount > 0 ? '✓' : '0'}`);
    console.log(`- Total CRM interactions created\n`);
}

linkSalesAndRepairsToCRM().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
