// Script de diagnóstico para problemas con el formulario de pago a consignadores
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('❌ Error: Configura las variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Diagnóstico de Problemas con Formulario de Pago a Consignadores');
console.log('================================================================\n');

async function diagnosePaymentDialogIssues() {
  try {
    // 1. Verificar estado actual de consignadores
    console.log('1. 👥 Verificando estado actual de consignadores...');
    const { data: consignors, error: consignorsError } = await supabase
      .from('consignors')
      .select('*');

    if (consignorsError) {
      console.error('   ❌ Error obteniendo consignadores:', consignorsError);
      return;
    }

    console.log(`   ✓ Se encontraron ${consignors.length} consignadores`);
    consignors.forEach(consignor => {
      console.log(`      - ${consignor.name}: Balance $${consignor.balanceDue || 0}`);
    });

    // 2. Verificar estructura de la tabla consignors
    console.log('\n2. 🏗️ Verificando estructura de la tabla consignors...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'consignors')
      .order('ordinal_position');

    if (columnsError) {
      console.error('   ❌ Error obteniendo estructura:', columnsError);
    } else {
      console.log('   ✓ Estructura de la tabla consignors:');
      columns.forEach(col => {
        console.log(`      - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }

    // 3. Verificar si existen las columnas adicionales que el API intenta actualizar
    console.log('\n3. 🔍 Verificando columnas de pago...');
    const paymentColumns = ['lastPaymentDate', 'lastPaymentAmount', 'updated_at'];
    
    for (const colName of paymentColumns) {
      const { data: colData, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'consignors')
        .eq('column_name', colName)
        .single();

      if (colError) {
        console.log(`   ⚠️  Columna '${colName}' no existe`);
      } else {
        console.log(`   ✓ Columna '${colName}' existe`);
      }
    }

    // 4. Verificar tabla de transacciones de consignadores
    console.log('\n4. 📊 Verificando tabla de transacciones...');
    const { data: transactionTable, error: transactionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'consignor_transactions')
      .single();

    if (transactionError) {
      console.log('   ⚠️  Tabla consignor_transactions no existe');
    } else {
      console.log('   ✓ Tabla consignor_transactions existe');
      
      // Verificar estructura de la tabla de transacciones
      const { data: transColumns, error: transColumnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'consignor_transactions')
        .order('ordinal_position');

      if (!transColumnsError && transColumns) {
        console.log('   ✓ Estructura de consignor_transactions:');
        transColumns.forEach(col => {
          console.log(`      - ${col.column_name}: ${col.data_type}`);
        });
      }
    }

    // 5. Simular una llamada al API de pago
    console.log('\n5. 🧪 Simulando llamada al API de pago...');
    
    if (consignors.length === 0) {
      console.log('   ⚠️  No hay consignadores para probar');
      return;
    }

    const testConsignor = consignors[0];
    console.log(`   📝 Probando con consignador: ${testConsignor.name} (ID: ${testConsignor.id})`);
    
    // Intentar registrar un pago de prueba
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/register_payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          p_consignor_id: testConsignor.id,
          p_amount: 10,
          p_payment_method: 'Efectivo',
          p_notes: 'Pago de prueba'
        })
      });

      if (response.ok) {
        console.log('   ✓ API de pago responde correctamente');
      } else {
        console.log(`   ⚠️  API responde con error: ${response.status}`);
        const errorText = await response.text();
        console.log(`      Detalles: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Error llamando al API: ${error.message}`);
    }

    // 6. Verificar problemas específicos del frontend
    console.log('\n6. 🐛 Identificando problemas potenciales del frontend...');
    
    console.log('   Problemas identificados:');
    console.log('   1. El ConsignorClient usa RegisterPaymentDialogFixed (línea 19)');
    console.log('   2. Hay múltiples versiones del RegisterPaymentDialog');
    console.log('   3. El API intenta actualizar columnas que pueden no existir');
    console.log('   4. El formulario tiene lógica compleja para manejar balances en cero');

    // 7. Verificar si hay pagos registrados previamente
    console.log('\n7. 💳 Verificando pagos registrados...');
    
    if (!transactionError) {
      const { data: payments, error: paymentsError } = await supabase
        .from('consignor_transactions')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(5);

      if (paymentsError) {
        console.log('   ⚠️  No se pudieron obtener pagos (tabla puede no existir)');
      } else {
        console.log(`   ✓ Se encontraron ${payments.length} pagos recientes:`);
        payments.forEach(payment => {
          console.log(`      - ${payment.consignorId}: $${payment.amount} (${payment.paymentMethod})`);
        });
      }
    }

    console.log('\n✅ Diagnóstico completado');
    console.log('\n📝 Resumen de problemas encontrados:');
    console.log('1. Posibles columnas faltantes en la tabla consignors');
    console.log('2. Múltiples versiones del componente de pago');
    console.log('3. Manejo complejo de estados en el formulario');
    console.log('4. Posibles errores en el flujo de actualización de balances');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar el diagnóstico
diagnosePaymentDialogIssues().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});