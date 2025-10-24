import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('🔍 CHECKING SALES SCHEMA\n');
    console.log('========================================\n');

    // Get all tables
    console.log('1️⃣  Available tables:\n');
    const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

    if (tableError) {
        console.log(`Error: ${tableError.message}`);
    } else {
        tables.forEach(t => console.log(`  - ${t.table_name}`));
    }

    // Get sales table columns
    console.log('\n\n2️⃣  Sales table structure:\n');
    
    const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'sales')
        .order('ordinal_position');

    if (columnError) {
        console.log(`Error: ${columnError.message}`);
    } else if (!columns || columns.length === 0) {
        console.log('No sales table found');
    } else {
        console.log('Columns in sales table:');
        columns.forEach(col => {
            const nullable = col.is_nullable ? 'NULL' : 'NOT NULL';
            console.log(`  - ${col.column_name} (${col.data_type}, ${nullable})`);
        });
    }

    // Get recent sales
    console.log('\n\n3️⃣  Recent sales (with all columns):\n');
    
    const { data: recentSales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .limit(3);

    if (salesError) {
        console.log(`Error: ${salesError.message}`);
    } else if (!recentSales || recentSales.length === 0) {
        console.log('No sales found');
    } else {
        console.log(`Found ${recentSales.length} sales:\n`);
        recentSales.forEach((sale, i) => {
            console.log(`Sale ${i + 1}:`);
            console.log(JSON.stringify(sale, null, 2));
            console.log('---');
        });
    }

    // Check for sale_items
    console.log('\n\n4️⃣  Checking sale_items table:\n');
    
    const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .limit(3);

    if (itemsError) {
        console.log(`Error: ${itemsError.message}`);
    } else if (!saleItems || saleItems.length === 0) {
        console.log('No sale items found');
    } else {
        console.log(`Found ${saleItems.length} sale items:\n`);
        saleItems.forEach((item, i) => {
            console.log(`Item ${i + 1}:`);
            console.log(JSON.stringify(item, null, 2));
            console.log('---');
        });
    }

    console.log('\n========================================');
}

checkSchema().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
