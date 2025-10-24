// Script específico para diagnosticar por qué la deuda del consignador se mantiene en 0
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

console.log('🔍 Diagnosticando Problema de Balance en Cero de Consignador');
console.log('=======================================================\n');

async function debugConsignorZeroBalance() {
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

    // 2. Identificar consignadores con balance en cero pero con ventas
    console.log('\n2. 🔍 Identificando consignadores con balance en cero...');
    
    const consignorsWithZeroBalance = consignors.filter(c => 
      (c.balanceDue === 0 || c.balanceDue === null || c.balanceDue === undefined)
    );
    
    console.log(`   ✓ Se encontraron ${consignorsWithZeroBalance.length} consignadores con balance en cero`);

    // 3. Obtener todas las ventas recientes
    console.log('\n3. 💰 Obteniendo ventas recientes...');
    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (salesError) {
      console.error('   ❌ Error al obtener ventas:', salesError);
      return;
    }

    console.log(`   ✓ Se encontraron ${allSales.length} ventas recientes`);

    // 4. Obtener todos los productos
    console.log('\n4. 📦 Obteniendo todos los productos...');
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      console.error('   ❌ Error al obtener productos:', productsError);
      return;
    }

    console.log(`   ✓ Se encontraron ${allProducts.length} productos`);

    // 5. Analizar cada consignador con balance en cero
    console.log('\n5. 🔍 Analizando consignadores con balance en cero...');
    
    for (const consignor of consignorsWithZeroBalance) {
      console.log(`\n   📊 Analizando consignador: ${consignor.name} (ID: ${consignor.id})`);
      console.log(`      Balance actual: $${consignor.balanceDue || 0}`);
      
      // 5.1. Obtener productos de este consignador
      const consignorProducts = allProducts.filter(p => p.consignor_id === consignor.id);
      console.log(`      Productos en consigna: ${consignorProducts.length}`);
      
      if (consignorProducts.length === 0) {
        console.log(`      ⚠️  Este consignador no tiene productos asignados`);
        continue;
      }
      
      // Mostrar algunos productos del consignador
      console.log(`      Productos del consignador:`);
      consignorProducts.slice(0, 3).forEach(product => {
        console.log(`         - ${product.name} (SKU: ${product.sku}, Costo: $${product.cost}, Stock: ${product.stock})`);
      });
      
      // 5.2. Buscar ventas con productos de este consignador
      const consignorSales = [];
      let totalExpectedCost = 0;
      
      for (const sale of allSales) {
        const items = sale.items || [];
        const consignorItems = items.filter(item => {
          // Buscar por consignorId directamente
          if (item.consignorId === consignor.id) {
            return true;
          }
          
          // También buscar por productId si el producto pertenece al consignador
          const product = consignorProducts.find(p => 
            (p.firestore_id === item.productId || p.id === item.productId)
          );
          
          return product !== undefined;
        });
        
        if (consignorItems.length > 0) {
          consignorSales.push({
            saleId: sale.saleId,
            date: sale.created_at,
            items: consignorItems
          });
          
          // Calcular costos esperados para esta venta
          for (const item of consignorItems) {
            // Buscar el producto para obtener el costo real
            const product = consignorProducts.find(p => 
              (p.firestore_id === item.productId || p.id === item.productId)
            );
            
            if (product) {
              const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
              totalExpectedCost += itemCost;
              
              console.log(`         - Venta ${sale.saleId}: ${item.name || product.name}`);
              console.log(`           Cantidad: ${item.quantity}, Costo unitario: $${product.cost}, Costo total: $${itemCost}`);
              console.log(`           Item tiene consignorId: ${item.consignorId ? 'SÍ' : 'NO'}`);
              console.log(`           Item tiene cost: ${item.cost !== undefined ? 'SÍ' : 'NO'}`);
            }
          }
        }
      }
      
      console.log(`      Ventas con productos del consignador: ${consignorSales.length}`);
      console.log(`      Costo total esperado: $${totalExpectedCost.toFixed(2)}`);
      
      // 5.3. Análisis del problema
      if (consignorSales.length > 0 && totalExpectedCost > 0) {
        console.log(`      ❌ PROBLEMA IDENTIFICADO:`);
        console.log(`         - Hay ${consignorSales.length} ventas con productos del consignador`);
        console.log(`         - El costo total esperado es $${totalExpectedCost.toFixed(2)}`);
        console.log(`         - Pero el balance del consignador es $${consignor.balanceDue || 0}`);
        console.log(`      🔍 Posibles causas:`);
        
        // Analizar las ventas en detalle
        let salesWithoutConsignorId = 0;
        let itemsWithoutCost = 0;
        
        for (const sale of consignorSales) {
          for (const item of sale.items) {
            if (!item.consignorId) {
              salesWithoutConsignorId++;
            }
            if (item.cost === undefined || item.cost === null) {
              itemsWithoutCost++;
            }
          }
        }
        
        if (salesWithoutConsignorId > 0) {
          console.log(`         - ${salesWithoutConsignorId} items no tienen consignorId`);
        }
        
        if (itemsWithoutCost > 0) {
          console.log(`         - ${itemsWithoutCost} items no tienen costo definido`);
        }
        
        console.log(`      💡 Solución recomendada:`);
        console.log(`         - Ejecutar el script de reparación: scripts/fix-consignor-cost-calculation.js`);
        console.log(`         - Verificar que los productos tengan correctamente asignado el consignor_id`);
        console.log(`         - Asegurar que las ventas incluyan el consignorId y el costo de los productos`);
      } else if (consignorSales.length === 0) {
        console.log(`      ℹ️  No se encontraron ventas con productos del consignador`);
        console.log(`      💡 Solución recomendada:`);
        console.log(`         - Verificar que los productos del consignador estén correctamente configurados`);
        console.log(`         - Revisar que las ventas recientes incluyan productos del consignador`);
      } else {
        console.log(`      ℹ️  Las ventas no generan costos (posiblemente productos con costo $0)`);
      }
    }

    // 6. Verificación específica del flujo de actualización
    console.log('\n6. 🔍 Verificando flujo de actualización de balances...');
    
    // Buscar una venta reciente con productos de consignación
    const recentSaleWithConsignor = allSales.find(sale => {
      const items = sale.items || [];
      return items.some(item => item.consignorId);
    });
    
    if (recentSaleWithConsignor) {
      console.log(`   📋 Analizando venta reciente: ${recentSaleWithConsignor.saleId}`);
      console.log(`   Fecha: ${new Date(recentSaleWithConsignor.created_at).toLocaleString()}`);
      
      const consignorItems = recentSaleWithConsignor.items.filter(item => item.consignorId);
      
      for (const item of consignorItems) {
        console.log(`   📦 Item: ${item.name}`);
        console.log(`      - ProductId: ${item.productId}`);
        console.log(`      - ConsignorId: ${item.consignorId}`);
        console.log(`      - Quantity: ${item.quantity}`);
        console.log(`      - PriceAtSale: $${item.priceAtSale}`);
        console.log(`      - Cost: ${item.cost !== undefined ? '$' + item.cost : 'NO DEFINIDO'}`);
        
        // Verificar el producto en la base de datos
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .or(`firestore_id.eq.${item.productId},id.eq.${item.productId}`)
          .single();
        
        if (!productError && product) {
          console.log(`      - Producto encontrado: ${product.name}`);
          console.log(`      - Costo en BD: $${product.cost}`);
          console.log(`      - ConsignorId en BD: ${product.consignor_id}`);
          
          // Verificar el consignador
          const { data: consignor, error: consignorError } = await supabase
            .from('consignors')
            .select('*')
            .eq('id', item.consignorId)
            .single();
          
          if (!consignorError && consignor) {
            console.log(`      - Consignador encontrado: ${consignor.name}`);
            console.log(`      - Balance actual: $${consignor.balanceDue || 0}`);
            
            // Calcular el costo esperado para este item
            const expectedCost = parseFloat(product.cost || 0) * (item.quantity || 1);
            console.log(`      - Costo esperado: $${expectedCost.toFixed(2)}`);
            
            // Verificar si el balance debería haberse actualizado
            if (consignor.balanceDue === 0 || consignor.balanceDue === null) {
              console.log(`      ❌ El balance no se actualizó correctamente`);
              console.log(`      🔍 Posible problema en el flujo de actualización`);
            }
          } else {
            console.log(`      ❌ Consignador no encontrado: ${consignorError?.message}`);
          }
        } else {
          console.log(`      ❌ Producto no encontrado: ${productError?.message}`);
        }
      }
    } else {
      console.log(`   ℹ️  No se encontraron ventas recientes con productos de consignación`);
    }

    console.log('\n✅ Diagnóstico completado');
    console.log('\n💡 Recomendaciones generales:');
    console.log('   1. Ejecutar el script de reparación: scripts/fix-consignor-cost-calculation.js');
    console.log('   2. Verificar que los productos tengan correctamente asignado el consignor_id');
    console.log('   3. Asegurar que las ventas incluyan el consignorId y el costo de los productos');
    console.log('   4. Revisar el flujo de actualización de balances en salesService.ts');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  }
}

// Ejecutar el diagnóstico
debugConsignorZeroBalance().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});