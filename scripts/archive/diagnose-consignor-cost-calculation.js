// Script de diagnóstico específico para el cálculo de costos de consignadores
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

console.log('🔍 Diagnóstico de Cálculo de Costos de Consignadores');
console.log('==================================================\n');

async function diagnoseConsignorCostCalculation() {
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
      .order('created_at', { ascending: false })
      .limit(100); // Limitar a las últimas 100 ventas para análisis

    if (salesError) {
      console.error('   ❌ Error al obtener ventas:', salesError);
      return;
    }

    console.log(`   ✓ Se encontraron ${allSales.length} ventas recientes`);

    // 4. Analizar cada consignador
    console.log('\n4. 🔍 Analizando balances de consignadores...');
    
    for (const consignor of consignors) {
      console.log(`\n   📊 Analizando consignador: ${consignor.name} (ID: ${consignor.id})`);
      console.log(`      Balance actual: $${consignor.balanceDue || 0}`);
      
      // 4.1. Obtener productos de este consignador
      const consignorProducts = consignmentProducts.filter(p => p.consignor_id === consignor.id);
      console.log(`      Productos en consigna: ${consignorProducts.length}`);
      
      // 4.2. Obtener ventas con productos de este consignador
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
              
              console.log(`         - Venta ${sale.saleId}: ${item.name || product.name}`);
              console.log(`           Cantidad: ${item.quantity}, Costo unitario: $${product.cost}, Costo total: $${itemCost}`);
              console.log(`           Precio venta: $${item.priceAtSale || item.price}, Ingreso: $${itemRevenue}`);
            } else {
              console.log(`         ⚠️  Venta ${sale.saleId}: Producto no encontrado (ID: ${item.productId})`);
            }
          }
        }
      }
      
      console.log(`      Ventas con productos del consignador: ${consignorSales.length}`);
      console.log(`      Total unidades vendidas: ${totalSoldQuantity}`);
      console.log(`      Costo total esperado: $${totalExpectedCost.toFixed(2)}`);
      console.log(`      Ingreso total por ventas: $${totalRevenue.toFixed(2)}`);
      console.log(`      Balance actual: $${consignor.balanceDue || 0}`);
      
      // 4.3. Comparar balance actual con esperado
      const currentBalance = parseFloat(consignor.balanceDue || 0);
      const difference = Math.abs(currentBalance - totalExpectedCost);
      
      if (difference > 0.01) { // Permitir pequeñas diferencias por redondeo
        console.log(`      ⚠️  DIFERENCIA DETECTADA: $${difference.toFixed(2)}`);
        console.log(`         Posibles causas:`);
        
        if (currentBalance < totalExpectedCost) {
          console.log(`         - Faltan costos por registrar: $${(totalExpectedCost - currentBalance).toFixed(2)}`);
          console.log(`         - Puede que algunas ventas no hayan actualizado el balance`);
        } else {
          console.log(`         - Sobran costos registrados: $${(currentBalance - totalExpectedCost).toFixed(2)}`);
          console.log(`         - Puede que haya pagos no registrados o costos duplicados`);
        }
      } else {
        console.log(`      ✅ Balance correcto`);
      }
    }

    // 5. Verificar problemas específicos en el flujo de ventas
    console.log('\n5. 🔍 Verificando problemas específicos en el flujo de ventas...');
    
    let problematicSales = 0;
    let salesWithoutConsignorId = 0;
    let salesWithIncorrectCosts = 0;
    
    for (const sale of allSales) {
      const items = sale.items || [];
      let hasIssues = false;
      
      for (const item of items) {
        // Verificar si es un producto de consignación sin consignorId
        const isConsignationProduct = consignmentProducts.some(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (isConsignationProduct && !item.consignorId) {
          salesWithoutConsignorId++;
          console.log(`   ⚠️  Venta ${sale.saleId}: Producto de consignación sin consignorId`);
          console.log(`      Producto: ${item.name} (ID: ${item.productId})`);
          hasIssues = true;
        }
        
        // Verificar si el costo en la venta coincide con el costo del producto
        if (item.consignorId) {
          const product = consignmentProducts.find(p => 
            (p.firestore_id === item.productId || p.id === item.productId)
          );
          
          if (product && item.cost !== undefined && item.cost !== product.cost) {
            salesWithIncorrectCosts++;
            console.log(`   ⚠️  Venta ${sale.saleId}: Costo incorrecto en item`);
            console.log(`      Producto: ${item.name}`);
            console.log(`      Costo en venta: $${item.cost}`);
            console.log(`      Costo real: $${product.cost}`);
            hasIssues = true;
          }
        }
      }
      
      if (hasIssues) {
        problematicSales++;
      }
    }
    
    console.log(`\n   📊 Resumen de problemas encontrados:`);
    console.log(`      - Ventas con problemas: ${problematicSales}`);
    console.log(`      - Items sin consignorId: ${salesWithoutConsignorId}`);
    console.log(`      - Items con costos incorrectos: ${salesWithIncorrectCosts}`);

    // 6. Recomendaciones
    console.log('\n6. 💡 Recomendaciones...');
    
    if (problematicSales > 0) {
      console.log('   Se encontraron problemas que requieren atención:');
      console.log('   1. Ejecutar el script de reparación: scripts/fix-consignor-sales.js');
      console.log('   2. Verificar que todas las ventas de productos de consignación tengan consignorId');
      console.log('   3. Asegurar que los costos en las ventas coincidan con los costos de los productos');
    } else {
      console.log('   ✅ No se encontraron problemas significativos');
      console.log('   ✅ El sistema parece estar funcionando correctamente');
    }

    console.log('\n✅ Diagnóstico completado');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar el diagnóstico
diagnoseConsignorCostCalculation().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});