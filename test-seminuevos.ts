import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
    const { data: seminuevos } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Celular Seminuevo');

    const childUnits = seminuevos?.filter(s => s.attributes?.is_model_template === false);
    console.log(`Found ${childUnits?.length || 0} seminuevos units.`);
    if (!childUnits || childUnits.length === 0) return;

    const { data: branchStock } = await supabase
        .from('branch_stock')
        .select('*')
        .in('product_id', childUnits.map(s => s.id));

    console.log(`Found ${branchStock?.length || 0} branch_stock records for these units.`);
    if (branchStock?.length) {
        console.log(branchStock.map(b => ({ product_id: b.product_id, stock: b.stock, branch_id: b.branch_id })));
    }
}

test().catch(console.error);
