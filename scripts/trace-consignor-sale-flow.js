// Script para rastrear el flujo completo de ventas y actualización de balances de consignadores
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

console.log('🔍 Rastreando Flujo Completo de Ventas de Consignadores');
console.log('===================================================\n');

async function traceConsignorSaleFlow() {
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

    // 2. Obtener productos de consignación
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

    // 4. Analizar el flujo completo para cada consignador
    console.log('\n4. 🔍 Analizando el flujo completo para cada consignador...');
    
    for (const consignor of consignors) {
      console.log(`\n   📊 Analizando consignador: ${consignor.name} (ID: ${consignor.id})`);
      console.log(`      Balance actual: $${consignor.balanceDue || 0}`);
      
      // 4.1. Obtener productos de este consignador
      const consignorProducts = consignmentProducts.filter(p => p.consignor_id === consignor.id);
      console.log(`      Productos en consigna: ${consignorProducts.length}`);
      
      if (consignorProducts.length === 0) {
        console.log(`      ⚠️  Este consignador no tiene productos asignados`);
        continue;
      }
      
      // 4.2. Obtener ventas con productos de este consignador
      const consignorSales = [];
      let totalExpectedCost = 0;
      let totalActualCost = 0;
      
      for (const sale of allSales) {
        const items = sale.items || [];
        const consignorItems = [];
        
        for (const item of items) {
          // Buscar por consignorId directamente
          if (item.consignorId === consignor.id) {
            consignorItems.push(item);
          } else {
            // También buscar por productId si el producto pertenece al consignador
            const product = consignorProducts.find(p => 
              (p.firestore_id === item.productId || p.id === item.productId)
            );
            
            if (product) {
              consignorItems.push({
                ...item,
                consignorId: consignor.id // Forzar el consignorId si no está presente
              });
            }
          }
        }
        
        if (consignorItems.length > 0) {
          consignorSales.push({
            saleId: sale.saleId,
            saleIdInternal: sale.id,
            date: sale.created_at,
            items: consignorItems
          });
          
          // Calcular costos esperados y actuales para esta venta
          for (const item of consignorItems) {
            // Buscar el producto para obtener el costo real
            const product = consignorProducts.find(p => 
              (p.firestore_id === item.productId || p.id === item.productId)
            );
            
            if (product) {
              const expectedCost = parseFloat(product.cost || 0) * (item.quantity || 1);
              const actualCost = item.cost !== undefined ? 
                parseFloat(item.cost || 0) * (item.quantity || 1) : 
                expectedCost;
              
              totalExpectedCost += expectedCost;
              totalActualCost += actualCost;
              
              console.log(`         - Venta ${sale.saleId}: ${item.name || product.name}`);
              console.log(`           Cantidad: ${item.quantity}`);
              console.log(`           Costo unitario esperado: $${product.cost}`);
              console.log(`           Costo unitario en venta: ${item.cost !== undefined ? '$' + item.cost : 'NO DEFINIDO'}`);
              console.log(`           Costo total esperado: $${expectedCost.toFixed(2)}`);
              console.log(`           Costo total en venta: $${actualCost.toFixed(2)}`);
              console.log(`           Item tiene consignorId: ${item.consignorId ? 'SÍ' : 'NO'}`);
            }
          }
        }
      }
      
      console.log(`      Ventas con productos del consignador: ${consignorSales.length}`);
      console.log(`      Costo total esperado: $${totalExpectedCost.toFixed(2)}`);
      console.log(`      Costo total en ventas: $${totalActualCost.toFixed(2)}`);
      
      // 4.3. Comparar balance actual con esperado
      const currentBalance = parseFloat(consignor.balanceDue || 0);
      const difference = Math.abs(currentBalance - totalExpectedCost);
      
      console.log(`      Balance actual: $${currentBalance.toFixed(2)}`);
      console.log(`      Balance esperado: $${totalExpectedCost.toFixed(2)}`);
      console.log(`      Diferencia: $${difference.toFixed(2)}`);
      
      // 4.4. Analizar problemas específicos
      if (difference > 0.01) {
        console.log(`      ❌ PROBLEMA IDENTIFICADO:`);
        
        if (currentBalance < totalExpectedCost) {
          console.log(`         - Faltan costos por registrar: $${(totalExpectedCost - currentBalance).toFixed(2)}`);
          console.log(`      🔍 Posibles causas:`);
          
          // Verificar si hay ventas sin consignorId
          let salesWithoutConsignorId = 0;
          for (const sale of consignorSales) {
            for (const item of sale.items) {
              if (!item.consignorId) {
                salesWithoutConsignorId++;
              }
            }
          }
          
          if (salesWithoutConsignorId > 0) {
            console.log(`         - ${salesWithoutConsignorId} items no tienen consignorId`);
          }
          
          // Verificar si hay items sin costo
          let itemsWithoutCost = 0;
          for (const sale of consignorSales) {
            for (const item of sale.items) {
              if (item.cost === undefined || item.cost === null) {
                itemsWithoutCost++;
              }
            }
          }
          
          if (itemsWithoutCost > 0) {
            console.log(`         - ${itemsWithoutCost} items no tienen costo definido`);
          }
          
        } else {
          console.log(`         - Sobran costos registrados: $${(currentBalance - totalExpectedCost).toFixed(2)}`);
          console.log(`      🔍 Posibles causas:`);
          console.log(`         - Puede que haya pagos no registrados`);
          console.log(`         - Puede que haya costos duplicados`);
        }
        
        console.log(`      💡 Solución recomendada:`);
        console.log(`         - Ejecutar el script de reparación: scripts/fix-consignor-zero-balance.js`);
        console.log(`         - Verificar que los productos tengan correctamente asignado el consignor_id`);
        console.log(`         - Asegurar que las ventas incluyan el consignorId y el costo de los productos`);
      } else {
        console.log(`      ✅ Balance correcto`);
      }
    }

    // 5. Verificar el flujo de actualización en tiempo real
    console.log('\n5. 🔄 Verificando el flujo de actualización en tiempo real...');
    
    // Buscar la venta más reciente con productos de consignación
    let mostRecentSale = null;
    let mostRecentConsignor = null;
    
    for (const sale of allSales) {
      const items = sale.items || [];
      
      for (const item of items) {
        const product = consignmentProducts.find(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (product) {
          mostRecentSale = sale;
          mostRecentConsignor = consignors.find(c => c.id === (item.consignorId || product.consignor_id));
          break;
        }
      }
      
      if (mostRecentSale) {
        break;
      }
    }
    
    if (mostRecentSale && mostRecentConsignor) {
      console.log(`   Venta más reciente: ${mostRecentSale.saleId}`);
      console.log(`   Consignador: ${mostRecentConsignor.name}`);
      console.log(`   Fecha: ${new Date(mostRecentSale.created_at).toLocaleString()}`);
      
      // Simular el flujo de actualización para esta venta
      console.log(`   🔍 Simulando el flujo de actualización...`);
      
      const items = mostRecentSale.items || [];
      let simulatedBalance = parseFloat(mostRecentConsignor.balanceDue || 0);
      
      for (const item of items) {
        const product = consignmentProducts.find(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (product && (item.consignorId === mostRecentConsignor.id || product.consignor_id === mostRecentConsignor.id)) {
          const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
          simulatedBalance += itemCost;
          
          console.log(`      - Item: ${item.name || product.name}`);
          console.log(`        - Costo: $${itemCost.toFixed(2)}`);
          console.log(`        - Balance parcial: $${simulatedBalance.toFixed(2)}`);
        }
      }
      
      console.log(`   Balance simulado: $${simulatedBalance.toFixed(2)}`);
      console.log(`   Balance actual: $${parseFloat(mostRecentConsignor.balanceDue || 0).toFixed(2)}`);
      
      const simulationDifference = Math.abs(simulatedBalance - parseFloat(mostRecentConsignor.balanceDue || 0));
      
      if (simulationDifference > 0.01) {
        console.log(`   ❌ La simulación no coincide con el balance actual`);
        console.log(`   💡 Esto confirma que hay un problema en el flujo de actualización`);
      } else {
        console.log(`   ✅ La simulación coincide con el balance actual`);
      }
    } else {
      console.log(`   ⚠️  No se encontraron ventas recientes con productos de consignación`);
    }

    console.log('\n✅ Rastreo completado');
    console.log('\n💡 Recomendaciones finales:');
    console.log('   1. Ejecuta el script de verificación: scripts/verify-consignor-product-assignments.js');
    console.log('   2. Si se encuentran problemas, ejecuta el script de reparación: scripts/fix-consignor-zero-balance.js');
    console.log('   3. Para probar una venta específica, ejecuta: scripts/debug-real-time-sale.js');
    console.log('   4. Para simular el flujo completo, ejecuta: scripts/simulate-consignor-sale.js');
    console.log('   5. Monitorea los balances de consignadores regularmente');

  } catch (error) {
    console.error('❌ Error durante el rastreo:', error);
  }
}

// Ejecutar el rastreo
traceConsignorSaleFlow().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});