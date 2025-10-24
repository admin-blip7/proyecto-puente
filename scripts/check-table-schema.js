// Script to check the actual schema of consignor_transactions table
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

async function checkTableSchema() {
  console.log('Checking consignor_transactions table schema...');
  
  try {
    const supabase = getSupabaseServerClient();
    
    // Query to get table schema information
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'consignor_transactions')
      .order('ordinal_position');
    
    if (schemaError) {
      console.error('Error checking table schema:', schemaError);
      return;
    }
    
    console.log('Table schema found:', schemaInfo);
    
    if (!schemaInfo || schemaInfo.length === 0) {
      console.log('❌ Table consignor_transactions does not exist or has no columns');
      
      // Try to check if table exists at all
      const { data: tableCheck, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'consignor_transactions');
        
      if (tableCheck && tableCheck.length > 0) {
        console.log('✅ Table exists but has no columns');
      } else {
        console.log('❌ Table does not exist in the database');
      }
    } else {
      console.log('✅ Table exists with columns:');
      schemaInfo.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

// Run the check
checkTableSchema();