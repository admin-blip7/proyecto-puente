const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProductNamesInSales() {
  console.log('Starting to fix product names in sales...');
  
  try {
    // 1. Get all sales (we'll filter them in the script)
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100); // Limit to recent sales for safety
    
    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return;
    }
    
    // 2. Filter sales that have "Producto desconocido" or empty names
    const salesWithUnknownProducts = sales.filter(sale => {
      if (!sale.items || !Array.isArray(sale.items)) return false;
      return sale.items.some(item =>
        item.name === 'Producto desconocido' ||
        !item.name ||
        item.name.trim() === ''
      );
    });
    
    console.log(`Found ${salesWithUnknownProducts.length} sales with "Producto desconocido" out of ${sales.length} total sales`);
    
    // 3. For each sale, fix the product names
    for (const sale of salesWithUnknownProducts) {
      console.log(`Processing sale: ${sale.saleId}`);
      
      const updatedItems = [];
      let hasChanges = false;
      
      for (const item of sale.items) {
        if (item.name === 'Producto desconocido' || !item.name) {
          // Fetch the product from the products table
          // Try with firestore_id first, then with id
          let { data: product, error: productError } = await supabase
            .from('products')
            .select('name')
            .eq('firestore_id', item.productId)
            .single();
          
          if (productError) {
            // Try with id field
            const result = await supabase
              .from('products')
              .select('name')
              .eq('id', item.productId)
              .single();
            
            product = result.data;
            productError = result.error;
          }
          
          if (productError) {
            console.error(`Error fetching product ${item.productId}:`, productError);
            // Create a descriptive name based on the productId
            const descriptiveName = `Producto ID: ${item.productId}`;
            console.log(`  Updating product ${item.productId}: "${item.name}" -> "${descriptiveName}"`);
            updatedItems.push({
              ...item,
              name: descriptiveName
            });
            hasChanges = true;
          } else {
            console.log(`  Updating product ${item.productId}: "${item.name}" -> "${product.name}"`);
            updatedItems.push({
              ...item,
              name: product.name
            });
            hasChanges = true;
          }
        } else {
          updatedItems.push(item);
        }
      }
      
      // 3. Update the sale if there are changes
      if (hasChanges) {
        const { error: updateError } = await supabase
          .from('sales')
          .update({ items: updatedItems })
          .eq('id', sale.id);
        
        if (updateError) {
          console.error(`Error updating sale ${sale.saleId}:`, updateError);
        } else {
          console.log(`  ✓ Updated sale ${sale.saleId}`);
        }
      } else {
        console.log(`  No changes needed for sale ${sale.saleId}`);
      }
    }
    
    console.log('Finished fixing product names in sales.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
fixProductNamesInSales();