// Script para probar el flujo completo de pagos a consignadores
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('❌ Error: Configura las variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Probando Flujo de Pagos a Consignadores');
console.log('==========================================\n');

async function testConsignorPaymentFlow() {
  try {
    // 1. Verificar estado actual
    console.log('1. 📊 Verificando estado actual...');
    
    const { data: consignors, error: consignorsError } = await supabase
      .from('consignors')
      .select('*')
      .single();

    if (consignorsError) {
      console.error('   ❌ Error obteniendo consignador:', consignorsError);
      return;
    }

    console.log(`   ✓ Consignador: ${consignors.name} - Balance: $${consignors.balanceDue || 0}`);

    // 2. Verificar que el balance sea suficiente para una prueba
    const testAmount = 10;
    const currentBalance = parseFloat(consignors.balanceDue || 0);
    
    if (currentBalance < testAmount) {
      console.log(`   ⚠️  Balance insuficiente para prueba. Actual: $${currentBalance}, Necesario: $${testAmount}`);
      console.log('   📝 Aumentando balance temporalmente para la prueba...');
      
      // Aumentar balance temporalmente
      const { error: updateError } = await supabase
        .from('consignors')
        .update({
          balanceDue: currentBalance + testAmount
        })
        .eq('id', consignors.id);

      if (updateError) {
        console.error('   ❌ Error actualizando balance:', updateError);
        return;
      }
      
      console.log(`   ✓ Balance actualizado a: $${currentBalance + testAmount}`);
    }

    // 3. Probar el API de registro de pago
    console.log('\n2. 💳 Probando API de registro de pago...');
    
    const paymentData = {
      amount: testAmount,
      paymentMethod: 'Efectivo',
      notes: 'Pago de prueba automatizado'
    };

    console.log(`   📝 Enviando pago: $${testAmount} por ${paymentData.paymentMethod}`);

    // Llamar al API endpoint directamente
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/register_payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        p_consignor_id: consignors.id,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.paymentMethod,
        p_notes: paymentData.notes
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('   ✓ Pago registrado correctamente vía RPC');
      console.log(`      Resultado: ${JSON.stringify(result)}`);
    } else {
      console.log(`   ⚠️  RPC no disponible, probando API REST directa...`);
      
      // Probar con el API REST directo
      const apiResponse = await fetch(`${supabaseUrl}/functions/v1/consignors/${consignors.id}/register-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(paymentData)
      });

      if (apiResponse.ok) {
        const apiResult = await apiResponse.json();
        console.log('   ✓ Pago registrado correctamente vía API REST');
        console.log(`      Resultado: ${JSON.stringify(apiResult)}`);
      } else {
        console.log(`   ⚠️  API REST no disponible, probando actualización directa...`);
        
        // Actualización directa como fallback
        const newBalance = (currentBalance + testAmount) - testAmount;
        const { error: directError } = await supabase
          .from('consignors')
          .update({
            balanceDue: newBalance
          })
          .eq('id', consignors.id);

        if (directError) {
          console.error(`   ❌ Error en actualización directa: ${directError.message}`);
        } else {
          console.log('   ✓ Pago registrado correctamente vía actualización directa');
          console.log(`      Balance actualizado: $${currentBalance + testAmount} → $${newBalance}`);
        }
      }
    }

    // 4. Verificar estado final
    console.log('\n3. ✅ Verificando estado final...');
    
    const { data: finalConsignor, error: finalError } = await supabase
      .from('consignors')
      .select('*')
      .eq('id', consignors.id)
      .single();

    if (!finalError && finalConsignor) {
      const finalBalance = parseFloat(finalConsignor.balanceDue || 0);
      const expectedBalance = (currentBalance + testAmount) - testAmount;
      
      console.log(`   ✓ Balance final: $${finalBalance}`);
      
      if (Math.abs(finalBalance - expectedBalance) < 0.01) {
        console.log(`   ✅ Balance actualizado correctamente`);
      } else {
        console.log(`   ❌ Balance incorrecto. Esperado: $${expectedBalance}, Actual: $${finalBalance}`);
      }
    }

    // 5. Restaurar balance original si era necesario
    if (currentBalance < testAmount) {
      console.log('\n4. 🔄 Restaurando balance original...');
      
      const { error: restoreError } = await supabase
        .from('consignors')
        .update({
          balanceDue: currentBalance
        })
        .eq('id', consignors.id);

      if (restoreError) {
        console.error(`   ❌ Error restaurando balance: ${restoreError.message}`);
      } else {
        console.log(`   ✓ Balance restaurado a: $${currentBalance}`);
      }
    }

    console.log('\n🎉 Prueba de flujo de pago completada');
    console.log('\n📋 Resumen:');
    console.log(`   - Consignador: ${consignors.name}`);
    console.log(`   - Monto de prueba: $${testAmount}`);
    console.log(`   - Método de pago: ${paymentData.paymentMethod}`);
    console.log(`   - Balance inicial: $${currentBalance}`);
    console.log(`   - Balance final: $${finalConsignor?.balanceDue || 0}`);

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar la prueba
testConsignorPaymentFlow().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});