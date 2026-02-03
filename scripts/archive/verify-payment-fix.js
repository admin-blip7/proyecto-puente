// Verification script for payment registration fix
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

async function verifyPaymentFix() {
  console.log('🔍 Verifying payment registration fix...\n');
  
  try {
    const supabase = getSupabaseServerClient();
    
    // 1. Check if consignor_transactions table exists
    console.log('1. Checking if consignor_transactions table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_name', 'consignor_transactions');
    
    if (tableError) {
      console.error('❌ Error checking table existence:', tableError);
      return false;
    }
    
    if (!tableCheck || tableCheck.length === 0) {
      console.log('❌ Table consignor_transactions does not exist');
      return false;
    }
    
    console.log('✅ Table exists in schema:', tableCheck[0].table_schema);
    
    // 2. Check table columns
    console.log('\n2. Checking table schema...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'consignor_transactions')
      .order('ordinal_position');
    
    if (columnsError) {
      console.error('❌ Error checking table columns:', columnsError);
      return false;
    }
    
    console.log('✅ Table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });
    
    // 3. Check if table has the required columns
    const requiredColumns = [
      'id', 'firestore_id', 'consignorId', 'consignorName', 
      'amount', 'paymentMethod', 'notes', 'previousBalance', 
      'newBalance', 'transactionType', 'createdAt'
    ];
    
    const missingColumns = requiredColumns.filter(col => 
      !columns.some(c => c.column_name === col)
    );
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing required columns:', missingColumns);
      return false;
    }
    
    console.log('✅ All required columns present');
    
    // 4. Test a simple insert to verify the table works
    console.log('\n3. Testing table insertion...');
    const testTransaction = {
      firestore_id: 'test-uuid-123',
      consignorId: '00000000-0000-0000-0000-000000000000',
      consignorName: 'Test Consignor',
      amount: 10.50,
      paymentMethod: 'Efectivo',
      notes: 'Test transaction',
      previousBalance: 100.00,
      newBalance: 90.00,
      transactionType: 'payment',
      createdAt: new Date().toISOString()
    };
    
    const { error: insertError } = await supabase
      .from('consignor_transactions')
      .insert(testTransaction);
    
    if (insertError) {
      console.error('❌ Error inserting test transaction:', insertError);
      return false;
    }
    
    console.log('✅ Test insertion successful');
    
    // 5. Clean up test data
    console.log('\n4. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('consignor_transactions')
      .delete()
      .eq('firestore_id', 'test-uuid-123');
    
    if (deleteError) {
      console.warn('⚠️ Warning cleaning up test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up');
    }
    
    console.log('\n🎉 All verification checks passed!');
    console.log('✅ Payment registration should now work correctly');
    return true;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// Run verification
verifyPaymentFix().then(success => {
  if (success) {
    console.log('\n🚀 Ready to test payment registration!');
    console.log('Try registering a payment with amount: 0.1 for consignor: 6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb');
  } else {
    console.log('\n❌ Fix verification failed. Check the errors above.');
  }
});