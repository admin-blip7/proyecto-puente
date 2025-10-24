// Test script to verify the payment registration fix
const fetch = require('node-fetch');

async function testPaymentRegistration() {
  console.log('Testing payment registration fix...');
  
  try {
    // Test data
    const consignorId = 'test-consignor-id'; // Replace with actual UUID
    const paymentData = {
      amount: 100.00,
      paymentMethod: 'Efectivo',
      notes: 'Test payment'
    };

    console.log('Sending request to:', `/api/consignors/${consignorId}/register-payment`);
    console.log('Payment data:', paymentData);

    const response = await fetch(`http://localhost:3000/api/consignors/${consignorId}/register-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });

    console.log('Response status:', response.status);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const result = await response.json();
      console.log('Response data:', result);
      
      if (response.ok) {
        console.log('✅ Payment registration test PASSED');
      } else {
        console.log('❌ Payment registration test FAILED:', result.error);
      }
    } else {
      const text = await response.text();
      console.log('Response text:', text);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testPaymentRegistration();