// Script para depurar una venta en tiempo real y verificar el flujo completo
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

console.log('🔍 Depurando Venta en Tiempo Real');
console.log('================================\n');

async function debugRealTimeSale() {
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

    // 3. Obtener las ventas más recientes
    console.log('\n3. 💰 Obteniendo ventas recientes...');
    const { data: recentSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (salesError) {
      console.error('   ❌ Error al obtener ventas:', salesError);
      return;
    }

    console.log(`   ✓ Se encontraron ${recentSales.length} ventas recientes`);

    // 4. Buscar una venta con productos de consignación
    console.log('\n4. 🔍 Buscando venta con productos de consignación...');
    
    let targetSale = null;
    let targetConsignor = null;
    
    for (const sale of recentSales) {
      const items = sale.items || [];
      const hasConsignorItems = items.some(item => {
        // Buscar por consignorId directamente
        if (item.consignorId) {
          targetConsignor = consignors.find(c => c.id === item.consignorId);
          return targetConsignor !== undefined;
        }
        
        // También buscar por productId si el producto pertenece a un consignador
        const product = consignmentProducts.find(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (product) {
          targetConsignor = consignors.find(c => c.id === product.consignor_id);
          return targetConsignor !== undefined;
        }
        
        return false;
      });
      
      if (hasConsignorItems) {
        targetSale = sale;
        break;
      }
    }
    
    if (!targetSale) {
      console.log('   ⚠️  No se encontraron ventas recientes con productos de consignación');
      console.log('   💡 Por favor, realiza una venta con un producto de consignación y vuelve a ejecutar este script');
      return;
    }
    
    console.log(`   ✓ Venta encontrada: ${targetSale.saleId}`);
    console.log(`   Fecha: ${new Date(targetSale.created_at).toLocaleString()}`);
    console.log(`   Consignador: ${targetConsignor?.name || 'No identificado'}`);
    
    // 5. Analizar en detalle la venta
    console.log('\n5. 📋 Analizando en detalle la venta...');
    
    const items = targetSale.items || [];
    console.log(`   Items en la venta: ${items.length}`);
    
    let consignorItems = [];
    let totalExpectedCost = 0;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`\n   Item ${i + 1}: ${item.name}`);
      console.log(`      - ProductId: ${item.productId}`);
      console.log(`      - Quantity: ${item.quantity}`);
      console.log(`      - PriceAtSale: $${item.priceAtSale}`);
      console.log(`      - ConsignorId: ${item.consignorId || 'NO TIENE'}`);
      console.log(`      - Cost: ${item.cost !== undefined ? '$' + item.cost : 'NO TIENE'}`);
      
      // Verificar si este es un producto de consignación
      const product = consignmentProducts.find(p => 
        (p.firestore_id === item.productId || p.id === item.productId)
      );
      
      if (product) {
        console.log(`      - Producto de consignación: SÍ`);
        console.log(`      - Nombre del producto: ${product.name}`);
        console.log(`      - Costo del producto: $${product.cost}`);
        console.log(`      - ConsignorId del producto: ${product.consignor_id}`);
        
        // Verificar si el item tiene el consignorId correcto
        if (item.consignorId === product.consignor_id) {
          console.log(`      - ConsignorId correcto: SÍ`);
          consignorItems.push(item);
          
          const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
          totalExpectedCost += itemCost;
          console.log(`      - Costo esperado: $${itemCost.toFixed(2)}`);
        } else {
          console.log(`      - ConsignorId correcto: NO`);
          console.log(`      - ConsignorId en item: ${item.consignorId || 'NO TIENE'}`);
          console.log(`      - ConsignorId en producto: ${product.consignor_id}`);
        }
      } else {
        console.log(`      - Producto de consignación: NO`);
      }
    }
    
    console.log(`\n   📊 Resumen de la venta:`);
    console.log(`      - Items de consignador: ${consignorItems.length}`);
    console.log(`      - Costo total esperado: $${totalExpectedCost.toFixed(2)}`);
    
    // 6. Verificar el balance actual del consignador
    if (targetConsignor) {
      console.log(`\n6. 🏦 Verificando balance del consignador...`);
      console.log(`   Consignador: ${targetConsignor.name}`);
      console.log(`   Balance actual: $${targetConsignor.balanceDue || 0}`);
      
      const currentBalance = parseFloat(targetConsignor.balanceDue || 0);
      const difference = Math.abs(currentBalance - totalExpectedCost);
      
      if (difference > 0.01) {
        console.log(`   ❌ PROBLEMA IDENTIFICADO:`);
        console.log(`      - Balance actual: $${currentBalance.toFixed(2)}`);
        console.log(`      - Balance esperado: $${totalExpectedCost.toFixed(2)}`);
        console.log(`      - Diferencia: $${difference.toFixed(2)}`);
        
        if (currentBalance < totalExpectedCost) {
          console.log(`      - Faltan costos por registrar: $${(totalExpectedCost - currentBalance).toFixed(2)}`);
        } else {
          console.log(`      - Sobran costos registrados: $${(currentBalance - totalExpectedCost).toFixed(2)}`);
        }
      } else {
        console.log(`   ✅ Balance correcto`);
      }
    }
    
    // 7. Simular el flujo de actualización de balance
    console.log('\n7. 🔄 Simulando el flujo de actualización de balance...');
    
    if (targetSale && consignorItems.length > 0 && targetConsignor) {
      console.log(`   Simulando actualización para la venta ${targetSale.saleId}...`);
      
      let simulatedBalance = parseFloat(targetConsignor.balanceDue || 0);
      
      for (const item of consignorItems) {
        const product = consignmentProducts.find(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (product) {
          const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
          simulatedBalance += itemCost;
          
          console.log(`      - Item: ${item.name}`);
          console.log(`        - Costo: $${itemCost.toFixed(2)}`);
          console.log(`        - Balance parcial: $${simulatedBalance.toFixed(2)}`);
        }
      }
      
      console.log(`   Balance simulado: $${simulatedBalance.toFixed(2)}`);
      
      // 8. Verificar si la venta se procesó correctamente
      console.log('\n8. 🔍 Verificando si la venta se procesó correctamente...');
      
      // Buscar logs de la venta
      const { data: logs, error: logsError } = await supabase
        .from('inventory_logs')
        .select('*')
        .eq('reference_id', targetSale.saleId)
        .limit(10);
      
      if (!logsError && logs && logs.length > 0) {
        console.log(`   ✓ Se encontraron ${logs.length} logs de inventario para esta venta`);
        logs.forEach(log => {
          console.log(`      - ${log.notes} (${log.created_at})`);
        });
      } else {
        console.log(`   ⚠️  No se encontraron logs de inventario para esta venta`);
      }
      
      // 9. Recomendaciones
      console.log('\n9. 💡 Recomendaciones...');
      
      if (simulatedBalance > parseFloat(targetConsignor.balanceDue || 0)) {
        console.log(`   1. Ejecuta el script de reparación: scripts/fix-consignor-zero-balance.js`);
        console.log(`   2. Verifica que la API de ventas esté llamando correctamente a la actualización de balances`);
        console.log(`   3. Revisa los logs del servidor para ver si hay errores durante la actualización`);
      } else {
        console.log(`   1. El balance parece ser correcto`);
        console.log(`   2. Si aún tienes problemas, verifica que estés viendo el consignador correcto`);
      }
    }

    console.log('\n✅ Depuración completada');

  } catch (error) {
    console.error('❌ Error durante la depuración:', error);
  }
}

// Ejecutar la depuración
debugRealTimeSale().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});