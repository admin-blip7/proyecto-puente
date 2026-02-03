// Script para analizar el flujo del API de ventas y identificar problemas
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

console.log('🔍 Analizando Flujo del API de Ventas');
console.log('===================================\n');

async function analyzeSalesAPIFlow() {
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

    // 4. Analizar el flujo de datos para cada venta
    console.log('\n4. 🔍 Analizando el flujo de datos para cada venta...');
    
    let problematicSales = 0;
    let salesWithConsignorItems = 0;
    
    for (const sale of recentSales) {
      console.log(`\n   📋 Analizando venta: ${sale.saleId}`);
      console.log(`      Fecha: ${new Date(sale.created_at).toLocaleString()}`);
      console.log(`      Total: $${sale.totalAmount}`);
      console.log(`      Items: ${sale.items?.length || 0}`);
      
      const items = sale.items || [];
      let hasConsignorItems = false;
      let saleHasIssues = false;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`\n      Item ${i + 1}: ${item.name}`);
        console.log(`         - ProductId: ${item.productId}`);
        console.log(`         - Quantity: ${item.quantity}`);
        console.log(`         - PriceAtSale: $${item.priceAtSale}`);
        console.log(`         - ConsignorId: ${item.consignorId || 'NO TIENE'}`);
        console.log(`         - Cost: ${item.cost !== undefined ? '$' + item.cost : 'NO TIENE'}`);
        
        // Verificar si este es un producto de consignación
        const product = consignmentProducts.find(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (product) {
          hasConsignorItems = true;
          console.log(`         - Producto de consignación: SÍ`);
          console.log(`         - Nombre del producto: ${product.name}`);
          console.log(`         - Costo del producto: $${product.cost}`);
          console.log(`         - ConsignorId del producto: ${product.consignor_id}`);
          
          // Verificar si el item tiene el consignorId correcto
          if (item.consignorId === product.consignor_id) {
            console.log(`         - ConsignorId correcto: SÍ`);
          } else {
            console.log(`         - ConsignorId correcto: NO`);
            console.log(`         - ConsignorId en item: ${item.consignorId || 'NO TIENE'}`);
            console.log(`         - ConsignorId en producto: ${product.consignor_id}`);
            saleHasIssues = true;
          }
          
          // Verificar si el item tiene el costo correcto
          const expectedCost = parseFloat(product.cost || 0) * (item.quantity || 1);
          const actualCost = item.cost !== undefined ? 
            parseFloat(item.cost || 0) * (item.quantity || 1) : 
            expectedCost;
          
          if (Math.abs(expectedCost - actualCost) > 0.01) {
            console.log(`         - Costo correcto: NO`);
            console.log(`         - Costo esperado: $${expectedCost.toFixed(2)}`);
            console.log(`         - Costo en venta: $${actualCost.toFixed(2)}`);
            saleHasIssues = true;
          } else {
            console.log(`         - Costo correcto: SÍ`);
          }
          
          // Verificar si el consignador existe
          const consignor = consignors.find(c => c.id === (item.consignorId || product.consignor_id));
          if (consignor) {
            console.log(`         - Consignador encontrado: SÍ (${consignor.name})`);
            console.log(`         - Balance actual: $${consignor.balanceDue || 0}`);
          } else {
            console.log(`         - Consignador encontrado: NO`);
            saleHasIssues = true;
          }
        } else {
          console.log(`         - Producto de consignación: NO`);
        }
      }
      
      if (hasConsignorItems) {
        salesWithConsignorItems++;
        
        if (saleHasIssues) {
          problematicSales++;
          console.log(`      ❌ Esta venta tiene problemas`);
        } else {
          console.log(`      ✅ Esta venta parece correcta`);
        }
      } else {
        console.log(`      ℹ️  Esta venta no tiene productos de consignación`);
      }
    }
    
    console.log(`\n   📊 Resumen del análisis:`);
    console.log(`      - Ventas analizadas: ${recentSales.length}`);
    console.log(`      - Ventas con productos de consignación: ${salesWithConsignorItems}`);
    console.log(`      - Ventas con problemas: ${problematicSales}`);
    
    // 5. Simular el flujo del API para una venta problemática
    if (problematicSales > 0) {
      console.log('\n5. 🔄 Simulando el flujo del API para una venta problemática...');
      
      // Encontrar una venta problemática
      let problematicSale = null;
      let problematicConsignor = null;
      
      for (const sale of recentSales) {
        const items = sale.items || [];
        let hasIssues = false;
        
        for (const item of items) {
          const product = consignmentProducts.find(p => 
            (p.firestore_id === item.productId || p.id === item.productId)
          );
          
          if (product) {
            if (item.consignorId !== product.consignor_id || 
                (item.cost !== undefined && Math.abs(parseFloat(item.cost || 0) - parseFloat(product.cost || 0)) > 0.01)) {
              hasIssues = true;
              problematicConsignor = consignors.find(c => c.id === (item.consignorId || product.consignor_id));
              break;
            }
          }
        }
        
        if (hasIssues) {
          problematicSale = sale;
          break;
        }
      }
      
      if (problematicSale && problematicConsignor) {
        console.log(`   Venta problemática: ${problematicSale.saleId}`);
        console.log(`   Consignador: ${problematicConsignor.name}`);
        console.log(`   Balance actual: $${problematicConsignor.balanceDue || 0}`);
        
        // Simular el flujo de corrección
        console.log(`   🔍 Simulando el flujo de corrección...`);
        
        const items = problematicSale.items || [];
        let correctedBalance = parseFloat(problematicConsignor.balanceDue || 0);
        
        for (const item of items) {
          const product = consignmentProducts.find(p => 
            (p.firestore_id === item.productId || p.id === item.productId)
          );
          
          if (product && (item.consignorId === product.consignor_id || problematicConsignor.id === product.consignor_id)) {
            const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
            correctedBalance += itemCost;
            
            console.log(`      - Item: ${item.name || product.name}`);
            console.log(`        - Costo: $${itemCost.toFixed(2)}`);
            console.log(`        - Balance parcial: $${correctedBalance.toFixed(2)}`);
          }
        }
        
        console.log(`   Balance corregido: $${correctedBalance.toFixed(2)}`);
        
        const difference = Math.abs(correctedBalance - parseFloat(problematicConsignor.balanceDue || 0));
        
        if (difference > 0.01) {
          console.log(`   ❌ La corrección cambiaría el balance en $${difference.toFixed(2)}`);
          console.log(`   💡 Esto confirma que hay un problema en el flujo de datos`);
        } else {
          console.log(`   ✅ La corrección no cambiaría el balance`);
        }
      }
    }

    // 6. Verificar el flujo de actualización de balances
    console.log('\n6. 🔍 Verificando el flujo de actualización de balances...');
    
    // Calcular el balance esperado para cada consignador
    for (const consignor of consignors) {
      const consignorProducts = consignmentProducts.filter(p => p.consignor_id === consignor.id);
      
      if (consignorProducts.length === 0) {
        continue;
      }
      
      let expectedBalance = 0;
      
      for (const sale of recentSales) {
        const items = sale.items || [];
        
        for (const item of items) {
          const product = consignmentProducts.find(p => 
            (p.firestore_id === item.productId || p.id === item.productId)
          );
          
          if (product && (item.consignorId === consignor.id || product.consignor_id === consignor.id)) {
            const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
            expectedBalance += itemCost;
          }
        }
      }
      
      const currentBalance = parseFloat(consignor.balanceDue || 0);
      const difference = Math.abs(currentBalance - expectedBalance);
      
      if (difference > 0.01) {
        console.log(`   ❌ ${consignor.name}: Balance incorrecto`);
        console.log(`      - Balance actual: $${currentBalance.toFixed(2)}`);
        console.log(`      - Balance esperado: $${expectedBalance.toFixed(2)}`);
        console.log(`      - Diferencia: $${difference.toFixed(2)}`);
      }
    }

    console.log('\n✅ Análisis completado');
    console.log('\n💡 Conclusiones:');
    
    if (problematicSales > 0) {
      console.log(`   1. Se encontraron ${problematicSales} ventas con problemas`);
      console.log(`   2. Los problemas pueden estar en:`);
      console.log(`      - Items sin consignorId`);
      console.log(`      - Items con consignorId incorrecto`);
      console.log(`      - Items sin costo o con costo incorrecto`);
      console.log(`   3. Recomendación: Ejecuta el script de reparación`);
    } else {
      console.log(`   1. No se encontraron problemas significativos en las ventas recientes`);
      console.log(`   2. El flujo del API parece funcionar correctamente`);
      console.log(`   3. Si aún tienes problemas, puede que sea en ventas más antiguas`);
    }
    
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Ejecuta el script de verificación: scripts/verify-consignor-product-assignments.js');
    console.log('   2. Si se encuentran problemas, ejecuta el script de reparación: scripts/fix-consignor-zero-balance.js');
    console.log('   3. Para rastrear el flujo completo, ejecuta: scripts/trace-consignor-sale-flow.js');

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  }
}

// Ejecutar el análisis
analyzeSalesAPIFlow().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});