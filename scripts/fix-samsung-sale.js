const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSamsungSale() {
  console.log('Searching for Samsung product...');
  
  try {
    // 1. First, find the Samsung product
    const { data: samsungProducts, error: productError } = await supabase
      .from('products')
      .select('*')
      .ilike('name', '%samsung%');
    
    if (productError) {
      console.error('Error finding Samsung product:', productError);
      return;
    }
    
    if (!samsungProducts || samsungProducts.length === 0) {
      console.log('No Samsung products found in the database');
      return;
    }
    
    console.log(`Found ${samsungProducts.length} Samsung products:`);
    samsungProducts.forEach(p => {
      console.log(`  - ID: ${p.id}, Firestore ID: ${p.firestore_id}, Name: ${p.name}`);
    });
    
    // 2. Find the recent sale SALE-731410C0
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('saleId', 'SALE-731410C0');
    
    if (salesError) {
      console.error('Error finding sale:', salesError);
      return;
    }
    
    if (!sales || sales.length === 0) {
      console.log('Sale SALE-731410C0 not found');
      return;
    }
    
    const sale = sales[0];
    console.log(`Found sale: ${sale.saleId}`);
    console.log('Current items:', sale.items);
    
    // 3. Update the sale with the correct Samsung product name
    const updatedItems = sale.items.map(item => {
      // Check if this item matches one of the Samsung products
      const samsungProduct = samsungProducts.find(p => 
        p.firestore_id === item.productId || 
        p.id === item.productId
      );
      
      if (samsungProduct) {
        console.log(`Updating item ${item.productId}: "${item.name}" -> "${samsungProduct.name}"`);
        return {
          ...item,
          name: samsungProduct.name
        };
      }
      
      return item;
    });
    
    // 4. Save the updated sale
    const { error: updateError } = await supabase
      .from('sales')
      .update({ items: updatedItems })
      .eq('id', sale.id);
    
    if (updateError) {
      console.error('Error updating sale:', updateError);
    } else {
      console.log('✓ Successfully updated sale with correct Samsung product name');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
fixSamsungSale();