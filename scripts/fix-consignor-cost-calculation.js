// Script para reparar el cálculo de costos de consignadores
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

console.log('🔧 Reparando Cálculo de Costos de Consignadores');
console.log('=============================================\n');

async function fixConsignorCostCalculation() {
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

    // 4. Analizar y reparar cada consignador
    console.log('\n4. 🔧 Analizando y reparando consignadores...');
    
    let totalConsignorsFixed = 0;
    let totalSalesFixed = 0;
    let totalCostsFixed = 0;
    
    for (const consignor of consignors) {
      console.log(`\n   📊 Analizando consignador: ${consignor.name} (ID: ${consignor.id})`);
      
      // 4.1. Obtener productos de este consignador
      const consignorProducts = consignmentProducts.filter(p => p.consignor_id === consignor.id);
      console.log(`      Productos en consigna: ${consignorProducts.length}`);
      
      // 4.2. Obtener ventas con productos de este consignador
      const consignorSales = [];
      let totalExpectedCost = 0;
      let salesToFix = [];
      
      for (const sale of allSales) {
        const items = sale.items || [];
        const consignorItems = items.filter(item => item.consignorId === consignor.id);
        
        if (consignorItems.length > 0) {
          consignorSales.push({
            saleId: sale.saleId,
            saleIdInternal: sale.id,
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
              totalExpectedCost += itemCost;
              
              // Verificar si el item necesita ser actualizado
              if (!item.consignorId || item.cost !== product.cost) {
                salesToFix.push({
                  saleId: sale.saleId,
                  saleIdInternal: sale.id,
                  itemId: item.productId,
                  itemName: item.name,
                  currentConsignorId: item.consignorId,
                  currentCost: item.cost,
                  correctConsignorId: consignor.id,
                  correctCost: product.cost,
                  quantity: item.quantity || 1
                });
              }
            }
          }
        }
      }
      
      console.log(`      Ventas con productos del consignador: ${consignorSales.length}`);
      console.log(`      Costo total esperado: $${totalExpectedCost.toFixed(2)}`);
      console.log(`      Balance actual: $${consignor.balanceDue || 0}`);
      
      // 4.3. Comparar balance actual con esperado
      const currentBalance = parseFloat(consignor.balanceDue || 0);
      const difference = Math.abs(currentBalance - totalExpectedCost);
      
      if (difference > 0.01 || salesToFix.length > 0) {
        console.log(`      ⚠️  Se necesitan reparaciones:`);
        console.log(`         - Diferencia de balance: $${difference.toFixed(2)}`);
        console.log(`         - Ventas a reparar: ${salesToFix.length}`);
        
        // 4.4. Reparar ventas si es necesario
        if (salesToFix.length > 0) {
          console.log(`      🔧 Reparando ventas...`);
          
          for (const saleFix of salesToFix) {
            console.log(`         Reparando venta ${saleFix.saleId}...`);
            
            // Obtener la venta completa
            const { data: sale, error: saleError } = await supabase
              .from('sales')
              .select('*')
              .eq('id', saleFix.saleIdInternal)
              .single();
            
            if (saleError) {
              console.error(`            ❌ Error al obtener venta: ${saleError.message}`);
              continue;
            }
            
            // Actualizar los items de la venta
            const updatedItems = sale.items.map(item => {
              if (item.productId === saleFix.itemId) {
                return {
                  ...item,
                  consignorId: saleFix.correctConsignorId,
                  cost: saleFix.correctCost
                };
              }
              return item;
            });
            
            // Actualizar la venta
            const { error: updateError } = await supabase
              .from('sales')
              .update({
                items: updatedItems
              })
              .eq('id', saleFix.saleIdInternal);
            
            if (updateError) {
              console.error(`            ❌ Error al actualizar venta: ${updateError.message}`);
            } else {
              console.log(`            ✓ Venta actualizada correctamente`);
              totalSalesFixed++;
            }
          }
        }
        
        // 4.5. Recalcular y actualizar el balance del consignador
        console.log(`      💰 Recalculando balance del consignador...`);
        
        let recalculatedCost = 0;
        
        // Volver a calcular el costo basado en todas las ventas
        for (const sale of allSales) {
          const items = sale.items || [];
          const consignorItems = items.filter(item => item.consignorId === consignor.id);
          
          for (const item of consignorItems) {
            const product = consignmentProducts.find(p => 
              (p.firestore_id === item.productId || p.id === item.productId)
            );
            
            if (product) {
              const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
              recalculatedCost += itemCost;
            }
          }
        }
        
        // Actualizar el balance del consignador
        const { error: balanceUpdateError } = await supabase
          .from('consignors')
          .update({
            balanceDue: recalculatedCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', consignor.id);
        
        if (balanceUpdateError) {
          console.error(`         ❌ Error al actualizar balance: ${balanceUpdateError.message}`);
        } else {
          console.log(`         ✓ Balance actualizado: $${currentBalance} → $${recalculatedCost.toFixed(2)}`);
          totalConsignorsFixed++;
          totalCostsFixed += Math.abs(recalculatedCost - currentBalance);
        }
      } else {
        console.log(`      ✅ Balance correcto, no se necesitan reparaciones`);
      }
    }

    // 5. Resumen final
    console.log('\n✅ Proceso completado');
    console.log('\n📊 Resumen de cambios:');
    console.log(`   - Consignadores reparados: ${totalConsignorsFixed}`);
    console.log(`   - Ventas reparadas: ${totalSalesFixed}`);
    console.log(`   - Costos corregidos: $${totalCostsFixed.toFixed(2)}`);

    // 6. Verificación final
    console.log('\n🔍 Verificación final...');
    const { data: finalConsignors, error: finalConsignorsError } = await supabase
      .from('consignors')
      .select('*')
      .order('name', { ascending: true });

    if (!finalConsignorsError && finalConsignors) {
      console.log('   Balances finales de consignadores:');
      finalConsignors.forEach(consignor => {
        console.log(`   - ${consignor.name}: $${(consignor.balanceDue || 0).toFixed(2)}`);
      });
    }

    console.log('\n💡 Recomendaciones:');
    console.log('   1. Ejecuta el script de diagnóstico periódicamente');
    console.log('   2. Monitorea los balances de consignadores regularmente');
    console.log('   3. Implementa validaciones en el frontend para evitar errores futuros');

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  }
}

// Ejecutar el script
fixConsignorCostCalculation().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});