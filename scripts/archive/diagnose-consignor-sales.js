
// Script de diagnóstico específico para ventas de consignadores
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

console.log('🔍 Diagnóstico de Ventas de Consignadores');
console.log('=====================================\n');

async function diagnoseConsignorSales() {
  try {
    // 1. Verificar productos en consigna
    console.log('1. 📦 Verificando productos en consigna...');
    const { data: consignmentProducts, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('ownership_type', 'Consigna')
      .not('consignor_id', 'is', null);

    if (productsError) {
      console.error('   ❌ Error al obtener productos en consigna:', productsError);
    } else {
      console.log(`   ✓ Se encontraron ${consignmentProducts.length} productos en consigna`);
      
      // Agrupar por consignador
      const productsByConsignor = {};
      consignmentProducts.forEach(product => {
        const consignorId = product.consignor_id;
        if (!productsByConsignor[consignorId]) {
          productsByConsignor[consignorId] = [];
        }
        productsByConsignor[consignorId].push(product);
      });

      console.log('   📊 Distribución por consignador:');
      for (const [consignorId, products] of Object.entries(productsByConsignor)) {
        console.log(`      - Consignador ID ${consignorId}: ${products.length} productos`);
        // Mostrar algunos productos de ejemplo
        products.slice(0, 3).forEach(p => {
          console.log(`        * ${p.name} (SKU: ${p.sku}, Stock: ${p.stock})`);
        });
        if (products.length > 3) {
          console.log(`        ... y ${products.length - 3} más`);
        }
      }
    }

    // 2. Verificar consignadores
    console.log('\n2. 👥 Verificando consignadores...');
    const { data: consignors, error: consignorsError } = await supabase
      .from('consignors')
      .select('*');

    if (consignorsError) {
      console.error('   ❌ Error al obtener consignadores:', consignorsError);
    } else {
      console.log(`   ✓ Se encontraron ${consignors.length} consignadores`);
      consignors.forEach(consignor => {
        console.log(`      - ${consignor.name} (ID: ${consignor.id}, Balance: $${consignor.balanceDue || 0})`);
      });
    }

    // 3. Verificar ventas recientes (últimas 50 ventas)
    console.log('\n3. 💰 Analizando ventas recientes (últimas 50 ventas)...');
    
    const { data: recentSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(50);

    if (salesError) {
      console.error('   ❌ Error al obtener ventas recientes:', salesError);
    } else {
      console.log(`   ✓ Se encontraron ${recentSales.length} ventas en los últimos 7 días`);
      
      // Analizar ventas con productos de consignadores
      let salesWithConsignorItems = 0;
      let totalConsignorSales = 0;
      const salesByConsignor = {};

      recentSales.forEach(sale => {
        const items = sale.items || [];
        const consignorItems = items.filter(item => item.consignorId);
        
        if (consignorItems.length > 0) {
          salesWithConsignorItems++;
          totalConsignorSales += consignorItems.length;
          
          consignorItems.forEach(item => {
            const consignorId = item.consignorId;
            if (!salesByConsignor[consignorId]) {
              salesByConsignor[consignorId] = { sales: 0, items: 0, total: 0 };
            }
            salesByConsignor[consignorId].sales++;
            salesByConsignor[consignorId].items++;
            salesByConsignor[consignorId].total += (item.priceAtSale || 0) * (item.quantity || 1);
          });

          console.log(`\n   📋 Venta ${sale.saleId}:`);
          console.log(`      Fecha: ${new Date(sale.created_at).toLocaleString()}`);
          console.log(`      Items de consignador: ${consignorItems.length}`);
          consignorItems.forEach(item => {
            console.log(`        - ${item.name} (Consignador ID: ${item.consignorId}, Cantidad: ${item.quantity}, Precio: $${item.priceAtSale})`);
          });
        }
      });

      console.log(`\n   📈 Resumen de ventas de consignadores:`);
      console.log(`      - Ventas con productos de consignadores: ${salesWithConsignorItems}/${recentSales.length}`);
      console.log(`      - Total de items de consignadores vendidos: ${totalConsignorSales}`);
      
      console.log('\n   💳 Ventas por consignador:');
      for (const [consignorId, data] of Object.entries(salesByConsignor)) {
        const consignor = consignors?.find(c => c.id === consignorId);
        const consignorName = consignor?.name || `ID ${consignorId} (no encontrado)`;
        console.log(`      - ${consignorName}: ${data.sales} ventas, ${data.items} items, $${data.total.toFixed(2)}`);
      }
    }

    // 4. Verificar balances de consignadores
    console.log('\n4. 🏦 Verificando balances de consignadores...');
    if (consignors && consignors.length > 0) {
      for (const consignor of consignors) {
        const { data: consignorSales, error: consignorSalesError } = await supabase
          .from('sales')
          .select('*')
          .contains('items', [{ consignorId: consignor.id }]); // Esto puede no funcionar perfectamente, es una aproximación

        if (!consignorSalesError && consignorSales) {
          // Calcular el balance esperado basado en ventas
          let expectedBalance = 0;
          consignorSales.forEach(sale => {
            const items = sale.items || [];
            const consignorItems = items.filter(item => item.consignorId === consignor.id);
            consignorItems.forEach(item => {
              // Necesitamos obtener el costo del producto
              expectedBalance += (item.cost || 0) * (item.quantity || 1);
            });
          });

          console.log(`   👤 ${consignor.name}:`);
          console.log(`      - Balance actual: $${consignor.balanceDue || 0}`);
          console.log(`      - Balance esperado (aproximado): $${expectedBalance.toFixed(2)}`);
          console.log(`      - Diferencia: $${Math.abs((consignor.balanceDue || 0) - expectedBalance).toFixed(2)}`);
        }
      }
    }

    // 5. Verificar problemas específicos
    console.log('\n5. 🔍 Buscando problemas específicos...');

    // 5.1. Productos en consigna sin consignador
    if (consignmentProducts) {
      const productsWithoutConsignor = consignmentProducts.filter(p => !p.consignor_id);
      
      if (productsWithoutConsignor.length > 0) {
        console.log(`   ⚠️  Se encontraron ${productsWithoutConsignor.length} productos en consigna sin consignador asignado:`);
        productsWithoutConsignor.forEach(p => {
          console.log(`      - ${p.name} (SKU: ${p.sku}, ID: ${p.id})`);
        });
      } else {
        console.log('   ✓ Todos los productos en consigna tienen consignador asignado');
      }

      // 5.2. Consignadores que no existen
      const invalidConsignorIds = [...new Set(consignmentProducts.map(p => p.consignor_id).filter(Boolean))]
        .filter(consignorId => !consignors?.find(c => c.id === consignorId));
      
      if (invalidConsignorIds.length > 0) {
        console.log(`   ⚠️  Se encontraron ${invalidConsignorIds.length} IDs de consignadores que no existen:`);
        invalidConsignorIds.forEach(id => {
          const affectedProducts = consignmentProducts.filter(p => p.consignor_id === id);
          console.log(`      - Consignador ID ${id}: ${affectedProducts.length} productos afectados`);
        });
      } else {
        console.log('   ✓ Todos los IDs de consignadores son válidos');
      }
    }

    // 6. Verificar estructura de ventas recientes
    console.log('\n6. 📋 Analizando estructura de ventas recientes...');
    if (recentSales && recentSales.length > 0) {
      const sampleSale = recentSales[0];
      console.log(`   📝 Estructura de venta ejemplo (${sampleSale.saleId}):`);
      console.log(`      - ID: ${sampleSale.id}`);
      console.log(`      - Sale ID: ${sampleSale.saleId}`);
      console.log(`      - Items count: ${sampleSale.items?.length || 0}`);
      
      if (sampleSale.items && sampleSale.items.length > 0) {
        console.log('      - Estructura de items:');
        sampleSale.items.forEach((item, index) => {
          console.log(`        Item ${index + 1}:`);
          console.log(`          - productId: ${item.productId}`);
          console.log(`          - name: ${item.name}`);
          console.log(`          - quantity: ${item.quantity}`);
          console.log(`          - priceAtSale: ${item.priceAtSale}`);
          console.log(`          - consignorId: ${item.consignorId || 'NO TIENE'}`);
          console.log(`          - ownershipType: ${item.ownershipType || 'NO TIENE'}`);
        });
      }
    }

    // 7. Verificar si hay ventas que deberían tener consignorId pero no lo tienen
    console.log('\n7. 🔍 Verificando ventas que deberían tener consignorId...');
    if (recentSales && consignmentProducts) {
      const consignmentProductIds = new Set(consignmentProducts.map(p => p.firestore_id || p.id));
      
      let problematicSales = 0;
      recentSales.forEach(sale => {
        const items = sale.items || [];
        items.forEach(item => {
          if (consignmentProductIds.has(item.productId) && !item.consignorId) {
            problematicSales++;
            console.log(`   ⚠️  Venta ${sale.saleId}: Producto ${item.name} (ID: ${item.productId}) es de consignación pero no tiene consignorId`);
          }
        });
      });
      
      if (problematicSales === 0) {
        console.log('   ✓ Todas las ventas de productos de consignación tienen consignorId');
      } else {
        console.log(`   ⚠️  Se encontraron ${problematicSales} items problemáticos en ventas`);
      }
    }

    console.log('\n✅ Diagnóstico completado');
    console.log('\n📝 Resumen de hallazgos:');
    console.log('1. Revisa si los productos en consigna tienen consignorId asignado');
    console.log('2. Verifica que las ventas de productos de consignación incluyan el consignorId');
    console.log('3. Compara los balances actuales de consignadores con las ventas realizadas');
    console.log('4. Identifica ventas que deberían tener consignorId pero no lo tienen');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar el diagnóstico
diagnoseConsignorSales().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});