// Script para verificar la configuración de productos antes de aplicar la solución
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

console.log('🔍 Verificando Configuración de Productos');
console.log('==========================================\n');

async function verifyProductsBeforeFix() {
  try {
    // 1. Verificar conexión a Supabase
    console.log('1. 🔗 Verificando conexión a Supabase...');
    
    const { error: testError } = await supabase.from('products').select('id').limit(1);
    if (testError) {
      console.error('   ❌ Error de conexión:', testError.message);
      return;
    }
    console.log('   ✓ Conexión establecida');

    // 2. Obtener todos los productos
    console.log('\n2. 📦 Obteniendo productos...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (productsError) {
      console.error('   ❌ Error al obtener productos:', productsError);
      return;
    }

    console.log(`   ✓ Se encontraron ${products.length} productos`);

    // 3. Verificar productos de consignación
    console.log('\n3. 🔍 Analizando productos de consignación...');
    
    const consignmentProducts = products.filter(p => p.ownership_type === 'Consigna');
    const regularProducts = products.filter(p => p.ownership_type !== 'Consigna');
    
    console.log(`   📊 Productos de consignación: ${consignmentProducts.length}`);
    console.log(`   📊 Productos regulares: ${regularProducts.length}`);

    // 4. Verificar productos de consignación sin consignor_id
    console.log('\n4. ⚠️  Verificando productos de consignación sin consignor_id...');
    
    const productsWithoutConsignor = consignmentProducts.filter(p => 
      !p.consignor_id || p.consignor_id === '' || p.consignor_id === null
    );
    
    if (productsWithoutConsignor.length > 0) {
      console.log(`   ❌ Productos sin consignor_id: ${productsWithoutConsignor.length}`);
      
      console.log('\n   Productos sin consignor_id:');
      productsWithoutConsignor.forEach(product => {
        console.log(`   - ${product.name} (SKU: ${product.sku}) - ID: ${product.id}`);
      });
    } else {
      console.log('   ✓ Todos los productos de consignación tienen consignor_id');
    }

    // 5. Verificar productos de consignación con consignor_id inválido
    console.log('\n5. ⚠️  Verificando productos con consignor_id inválido...');
    
    // Obtener todos los consignadores
    const { data: consignors, error: consignorsError } = await supabase
      .from('consignors')
      .select('id, name');
    
    if (consignorsError) {
      console.error('   ❌ Error al obtener consignadores:', consignorsError);
      return;
    }
    
    const validConsignorIds = consignors.map(c => c.id);
    const productsWithInvalidConsignor = consignmentProducts.filter(p => 
      p.consignor_id && !validConsignorIds.includes(p.consignor_id)
    );
    
    if (productsWithInvalidConsignor.length > 0) {
      console.log(`   ❌ Productos con consignor_id inválido: ${productsWithInvalidConsignor.length}`);
      
      console.log('\n   Productos con consignor_id inválido:');
      productsWithInvalidConsignor.forEach(product => {
        console.log(`   - ${product.name} (SKU: ${product.sku})`);
        console.log(`     consignor_id: ${product.consignor_id}`);
      });
    } else {
      console.log('   ✓ No hay productos con consignor_id inválido');
    }

    // 6. Verificar costos de productos
    console.log('\n6. 💰 Verificando costos de productos...');
    
    const productsWithoutCost = consignmentProducts.filter(p => 
      !p.cost || p.cost === 0 || p.cost === '' || p.cost === null
    );
    
    if (productsWithoutCost.length > 0) {
      console.log(`   ⚠️  Productos sin costo definido: ${productsWithoutCost.length}`);
      
      console.log('\n   Productos sin costo:');
      productsWithoutCost.forEach(product => {
        console.log(`   - ${product.name} (SKU: ${product.sku}) - Precio: $${product.price || '0'}`);
      });
    } else {
      console.log('   ✓ Todos los productos tienen costo definido');
    }

    // 7. Verificar consignadores
    console.log('\n7. 👥 Verificando consignadores...');
    
    if (consignors.length === 0) {
      console.log('   ❌ No hay consignadores registrados');
    } else {
      console.log(`   ✓ Consignadores registrados: ${consignors.length}`);
      
      console.log('\n   Consignadores:');
      consignors.forEach(consignor => {
        console.log(`   - ${consignor.name} (ID: ${consignor.id}) - Balance: $${consignor.balanceDue || '0.00'}`);
      });
    }

    // 8. Verificar ventas
    console.log('\n8. 💵 Verificando ventas...');
    
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(10);
    
    if (salesError) {
      console.error('   ❌ Error al obtener ventas:', salesError);
      return;
    }
    
    console.log(`   ✓ Últimas ${sales.length} ventas obtenidas`);
    
    // Verificar ventas con productos de consignación
    let salesWithConsignment = 0;
    let itemsWithConsignorId = 0;
    
    for (const sale of sales) {
      const items = sale.items || [];
      
      for (const item of items) {
        // Buscar el producto
        const product = products.find(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (product && product.ownership_type === 'Consigna') {
          salesWithConsignment++;
          
          if (item.consignorId) {
            itemsWithConsignorId++;
          }
        }
      }
    }
    
    console.log(`   - Ventas con productos de consignación: ${salesWithConsignment}`);
    console.log(`   - Items con consignorId: ${itemsWithConsignorId}`);

    // 9. Verificar balances de consignadores
    console.log('\n9. 📊 Verificando balances de consignadores...');
    
    let consignorsWithZeroBalance = 0;
    let consignorsWithProductsButZeroBalance = 0;
    
    for (const consignor of consignors) {
      const balance = parseFloat(consignor.balanceDue || 0);
      const consignorProducts = products.filter(p => p.consignor_id === consignor.id);
      
      if (balance === 0) {
        consignorsWithZeroBalance++;
        
        if (consignorProducts.length > 0) {
          consignorsWithProductsButZeroBalance++;
          console.log(`   ⚠️  ${consignor.name} tiene $0 balance pero ${consignorProducts.length} productos`);
        }
      } else {
        console.log(`   ✅ ${consignor.name}: $${balance.toFixed(2)}`);
      }
    }
    
    console.log(`   - Consignadores con balance en $0: ${consignorsWithZeroBalance}`);
    console.log(`   - Consignadores con productos pero balance $0: ${consignorsWithProductsButZeroBalance}`);

    // 10. Resumen y recomendaciones
    console.log('\n📋 Resumen de verificación:');
    
    const issuesFound = [
      productsWithoutConsignor.length > 0 ? `Productos sin consignor_id (${productsWithoutConsignor.length})` : null,
      productsWithInvalidConsignor.length > 0 ? `Productos con consignor_id inválido (${productsWithInvalidConsignor.length})` : null,
      productsWithoutCost.length > 0 ? `Productos sin costo (${productsWithoutCost.length})` : null,
      consignors.length === 0 ? 'No hay consignadores registrados' : null,
      consignorsWithProductsButZeroBalance > 0 ? `Consignadores con productos pero balance $0 (${consignorsWithProductsButZeroBalance})` : null
    ].filter(issue => issue !== null);
    
    if (issuesFound.length === 0) {
      console.log('   ✅ No se encontraron problemas críticos');
      console.log('   🚀 Puedes proceder con la solución');
    } else {
      console.log('   ⚠️  Problemas encontrados:');
      issuesFound.forEach(issue => console.log(`   - ${issue}`));
      console.log('\n   🔧 Recomendamos ejecutar el script de solución para corregir estos problemas');
    }

    // 11. Verificar si los scripts anteriores han sido ejecutados
    console.log('\n10. 🔍 Verificando si se han ejecutado scripts anteriores...');
    
    // Buscar en la tabla de logs si hay registros de ejecución
    const { data: logs, error: logsError } = await supabase
      .from('logs')
      .select('*')
      .like('message', '%balance%')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!logsError && logs && logs.length > 0) {
      console.log('   📝 Registros de logs encontrados:');
      logs.forEach(log => {
        console.log(`   - ${new Date(log.created_at).toLocaleString()}: ${log.message.substring(0, 50)}...`);
      });
    } else {
      console.log('   ℹ️  No se encontraron logs recientes de balance');
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar la verificación
verifyProductsBeforeFix().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});