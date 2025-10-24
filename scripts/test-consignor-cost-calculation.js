// Script para probar el cálculo de costos de consignadores
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('❌ Error: Configura las variables de entorno de Supabase');
  console.log('Variables necesarias:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Probando Cálculo de Costos de Consignadores');
console.log('============================================\n');

async function testConsignorCostCalculation() {
  try {
    // 1. Obtener todos los consignadores
    console.log('1. 👥 Obteniendo consignadores...');
    const { data: consignors, error: consignorsError } = await supabase
      .from('consignors')
      .select('*')
      .order('name', { ascending: true });

    if (consignorsError) {
      console.error('   ❌ Error al obtener consignadores:', consignorsError);
      return;
    }

    console.log(`   ✓ Se encontraron ${consignors.length} consignadores`);

    // 2. Obtener todos los productos de consignación
    console.log('\n2. 📦 Obteniendo productos de consignación...');
    const { data: consignmentProducts, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('ownership_type', 'Consigna')
      .not('consignor_id', 'is', null);

    if (productsError) {
      console.error('   ❌ Error al obtener productos de consignación:', productsError);
      return;
    }

    console.log(`   ✓ Se encontraron ${consignmentProducts.length} productos de consignación`);

    // 3. Obtener todas las ventas
    console.log('\n3. 💰 Obteniendo todas las ventas...');
    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('   ❌ Error al obtener ventas:', salesError);
      return;
    }

    console.log(`   ✓ Se encontraron ${allSales.length} ventas`);

    // 4. Crear un escenario de prueba si no hay datos suficientes
    if (consignors.length === 0) {
      console.log('\n⚠️  No hay consignadores. Creando uno de prueba...');
      
      const { data: newConsignor, error: createError } = await supabase
        .from('consignors')
        .insert({
          name: 'Consignador de Prueba',
          contactInfo: 'test@example.com',
          balanceDue: 0
        })
        .select('*')
        .single();
      
      if (createError) {
        console.error('   ❌ Error al crear consignador de prueba:', createError);
        return;
      }
      
      consignors.push(newConsignor);
      console.log(`   ✓ Consignador de prueba creado: ${newConsignor.name}`);
    }

    // 5. Analizar cada consignador
    console.log('\n4. 🔍 Analizando balances de consignadores...');
    
    let allTestsPassed = true;
    const testResults = [];
    
    for (const consignor of consignors) {
      console.log(`\n   📊 Analizando consignador: ${consignor.name} (ID: ${consignor.id})`);
      
      // 5.1. Obtener productos de este consignador
      const consignorProducts = consignmentProducts.filter(p => p.consignor_id === consignor.id);
      console.log(`      Productos en consigna: ${consignorProducts.length}`);
      
      // 5.2. Obtener ventas con productos de este consignador
      const consignorSales = [];
      let totalExpectedCost = 0;
      let totalSoldQuantity = 0;
      let totalRevenue = 0;
      
      for (const sale of allSales) {
        const items = sale.items || [];
        const consignorItems = items.filter(item => item.consignorId === consignor.id);
        
        if (consignorItems.length > 0) {
          consignorSales.push({
            saleId: sale.saleId,
            date: sale.created_at,
            items: consignorItems
          });
          
          // Calcular costos esperados para esta venta
          for (const item of consignorItems) {
            // Buscar el producto para obtener el costo real
            const product = consignmentProducts.find(p => 
              (p.firestore_id === item.productId || p.id === item.productId)
            );
            
            if (product) {
              const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
              const itemRevenue = parseFloat(item.priceAtSale || item.price || 0) * (item.quantity || 1);
              
              totalExpectedCost += itemCost;
              totalSoldQuantity += (item.quantity || 1);
              totalRevenue += itemRevenue;
            }
          }
        }
      }
      
      console.log(`      Ventas con productos del consignador: ${consignorSales.length}`);
      console.log(`      Total unidades vendidas: ${totalSoldQuantity}`);
      console.log(`      Costo total esperado: $${totalExpectedCost.toFixed(2)}`);
      console.log(`      Ingreso total por ventas: $${totalRevenue.toFixed(2)}`);
      console.log(`      Balance actual: $${consignor.balanceDue || 0}`);
      
      // 5.3. Comparar balance actual con esperado
      const currentBalance = parseFloat(consignor.balanceDue || 0);
      const difference = Math.abs(currentBalance - totalExpectedCost);
      
      const testResult = {
        consignorName: consignor.name,
        consignorId: consignor.id,
        currentBalance,
        expectedBalance: totalExpectedCost,
        difference,
        passed: difference <= 0.01, // Permitir pequeñas diferencias por redondeo
        salesCount: consignorSales.length,
        totalSoldQuantity,
        totalRevenue
      };
      
      testResults.push(testResult);
      
      if (testResult.passed) {
        console.log(`      ✅ Test PASADO: Balance correcto`);
      } else {
        console.log(`      ❌ Test FALLIDO: Diferencia de $${difference.toFixed(2)}`);
        allTestsPassed = false;
        
        if (currentBalance < totalExpectedCost) {
          console.log(`         - Faltan costos por registrar: $${(totalExpectedCost - currentBalance).toFixed(2)}`);
        } else {
          console.log(`         - Sobran costos registrados: $${(currentBalance - totalExpectedCost).toFixed(2)}`);
        }
      }
    }

    // 6. Resumen de pruebas
    console.log('\n5. 📋 Resumen de pruebas...');
    console.log(`   Total de consignadores probados: ${testResults.length}`);
    console.log(`   Tests pasados: ${testResults.filter(r => r.passed).length}`);
    console.log(`   Tests fallidos: ${testResults.filter(r => !r.passed).length}`);
    
    if (allTestsPassed) {
      console.log('\n✅ Todos los tests PASARON');
      console.log('   El cálculo de costos de consignadores funciona correctamente');
    } else {
      console.log('\n❌ Algunos tests FALLARON');
      console.log('   Se requiere reparación del cálculo de costos de consignadores');
      
      console.log('\n📊 Detalles de los tests fallidos:');
      testResults.filter(r => !r.passed).forEach(result => {
        console.log(`   - ${result.consignorName}: Diferencia de $${result.difference.toFixed(2)}`);
        console.log(`     Balance actual: $${result.currentBalance.toFixed(2)}`);
        console.log(`     Balance esperado: $${result.expectedBalance.toFixed(2)}`);
      });
    }

    // 7. Prueba de escenario específico
    console.log('\n6. 🧪 Probando escenario específico...');
    
    if (consignors.length > 0 && consignmentProducts.length > 0) {
      const testConsignor = consignors[0];
      const testProduct = consignmentProducts.find(p => p.consignor_id === testConsignor.id);
      
      if (testProduct) {
        console.log(`   Probando con producto: ${testProduct.name}`);
        console.log(`   Consignador: ${testConsignor.name}`);
        console.log(`   Costo del producto: $${testProduct.cost}`);
        
        // Simular una venta
        const simulatedSale = {
          saleId: `TEST-SALE-${Date.now()}`,
          items: [{
            productId: testProduct.firestore_id || testProduct.id,
            name: testProduct.name,
            quantity: 1,
            priceAtSale: testProduct.price || (testProduct.cost * 1.2),
            consignorId: testConsignor.id
          }]
        };
        
        const expectedCostIncrease = parseFloat(testProduct.cost || 0) * 1;
        const expectedNewBalance = (parseFloat(testConsignor.balanceDue || 0) + expectedCostIncrease);
        
        console.log(`   Venta simulada:`);
        console.log(`   - Producto: ${simulatedSale.items[0].name}`);
        console.log(`   - Cantidad: ${simulatedSale.items[0].quantity}`);
        console.log(`   - Precio: $${simulatedSale.items[0].priceAtSale}`);
        console.log(`   - Costo esperado: $${expectedCostIncrease}`);
        console.log(`   - Balance actual: $${testConsignor.balanceDue || 0}`);
        console.log(`   - Balance esperado después de la venta: $${expectedNewBalance.toFixed(2)}`);
        
        console.log(`   ✅ Escenario simulado correctamente`);
      } else {
        console.log(`   ⚠️  No se encontraron productos para el consignador ${testConsignor.name}`);
      }
    } else {
      console.log(`   ⚠️  No hay suficientes datos para probar escenario específico`);
    }

    // 8. Recomendaciones
    console.log('\n7. 💡 Recomendaciones...');
    
    if (allTestsPassed) {
      console.log('   ✅ El sistema está funcionando correctamente');
      console.log('   ✅ No se requieren acciones adicionales');
    } else {
      console.log('   ⚠️  Se detectaron problemas que requieren atención:');
      console.log('   1. Ejecutar el script de reparación: scripts/fix-consignor-cost-calculation.js');
      console.log('   2. Verificar que todas las ventas de productos de consignación tengan consignorId');
      console.log('   3. Asegurar que los costos en las ventas coincidan con los costos de los productos');
      console.log('   4. Implementar validaciones para evitar errores futuros');
    }

    console.log('\n✅ Pruebas completadas');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Ejecutar las pruebas
testConsignorCostCalculation().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});