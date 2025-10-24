// Script específico para reparar el problema de balance en cero de consignadores
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

console.log('🔧 Reparando Problema de Balance en Cero de Consignador');
console.log('===================================================\n');

async function fixConsignorZeroBalance() {
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

    // 2. Obtener todas las ventas
    console.log('\n2. 💰 Obteniendo todas las ventas...');
    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error('   ❌ Error al obtener ventas:', salesError);
      return;
    }

    console.log(`   ✓ Se encontraron ${allSales.length} ventas`);

    // 3. Obtener todos los productos
    console.log('\n3. 📦 Obteniendo todos los productos...');
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      console.error('   ❌ Error al obtener productos:', productsError);
      return;
    }

    console.log(`   ✓ Se encontraron ${allProducts.length} productos`);

    // 4. Reparar cada consignador con balance en cero pero con ventas
    console.log('\n4. 🔧 Reparando consignadores con balance en cero...');
    
    let totalConsignorsFixed = 0;
    let totalSalesFixed = 0;
    let totalCostsFixed = 0;
    
    for (const consignor of consignors) {
      const currentBalance = parseFloat(consignor.balanceDue || 0);
      
      // Solo procesar consignadores con balance en cero
      if (currentBalance > 0) {
        console.log(`\n   📊 Omitiendo consignador ${consignor.name}: balance > 0 ($${currentBalance})`);
        continue;
      }
      
      console.log(`\n   📊 Analizando consignador: ${consignor.name} (ID: ${consignor.id})`);
      console.log(`      Balance actual: $${currentBalance}`);
      
      // 4.1. Obtener productos de este consignador
      const consignorProducts = allProducts.filter(p => p.consignor_id === consignor.id);
      console.log(`      Productos en consigna: ${consignorProducts.length}`);
      
      if (consignorProducts.length === 0) {
        console.log(`      ⚠️  Este consignador no tiene productos asignados`);
        continue;
      }
      
      // 4.2. Buscar ventas con productos de este consignador
      const consignorSales = [];
      let totalExpectedCost = 0;
      let salesToFix = [];
      
      for (const sale of allSales) {
        const items = sale.items || [];
        let hasConsignorItems = false;
        
        for (const item of items) {
          // Buscar por consignorId directamente
          if (item.consignorId === consignor.id) {
            hasConsignorItems = true;
            
            // Buscar el producto para obtener el costo real
            const product = consignorProducts.find(p => 
              (p.firestore_id === item.productId || p.id === item.productId)
            );
            
            if (product) {
              const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
              totalExpectedCost += itemCost;
              
              // Verificar si el item necesita ser actualizado
              if (!item.consignorId || !item.cost || item.cost !== product.cost) {
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
          } else {
            // También buscar por productId si el producto pertenece al consignador
            const product = consignorProducts.find(p => 
              (p.firestore_id === item.productId || p.id === item.productId)
            );
            
            if (product) {
              hasConsignorItems = true;
              const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
              totalExpectedCost += itemCost;
              
              // Este item necesita ser actualizado porque no tiene consignorId
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
        
        if (hasConsignorItems) {
          consignorSales.push({
            saleId: sale.saleId,
            saleIdInternal: sale.id,
            date: sale.created_at,
            items: items.filter(item => {
              return item.consignorId === consignor.id || consignorProducts.some(p => 
                (p.firestore_id === item.productId || p.id === item.productId)
              );
            })
          });
        }
      }
      
      console.log(`      Ventas con productos del consignador: ${consignorSales.length}`);
      console.log(`      Costo total esperado: $${totalExpectedCost.toFixed(2)}`);
      console.log(`      Ventas a reparar: ${salesToFix.length}`);
      
      // 4.3. Si hay ventas que reparar o hay diferencia de balance, proceder con la reparación
      if (salesToFix.length > 0 || totalExpectedCost > 0) {
        console.log(`      🔧 Iniciando reparación...`);
        
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
        
        // Volver a calcular el costo basado en todas las ventas (incluyendo las ya reparadas)
        for (const sale of allSales) {
          const items = sale.items || [];
          
          for (const item of items) {
            // Verificar si el item pertenece al consignador
            if (item.consignorId === consignor.id) {
              const product = consignorProducts.find(p => 
                (p.firestore_id === item.productId || p.id === item.productId)
              );
              
              if (product) {
                const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
                recalculatedCost += itemCost;
              }
            } else {
              // También verificar por productId si el producto pertenece al consignador
              const product = consignorProducts.find(p => 
                (p.firestore_id === item.productId || p.id === item.productId)
              );
              
              if (product) {
                const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
                recalculatedCost += itemCost;
              }
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
        console.log(`      ✅ No se necesitan reparaciones para este consignador`);
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
        const balance = parseFloat(consignor.balanceDue || 0);
        const status = balance > 0 ? '✅' : '⚠️';
        console.log(`   ${status} ${consignor.name}: $${balance.toFixed(2)}`);
      });
    }

    console.log('\n💡 Recomendaciones:');
    console.log('   1. Ejecuta el script de diagnóstico periódicamente');
    console.log('   2. Monitorea los balances de consignadores regularmente');
    console.log('   3. Implementa validaciones en el frontend para evitar errores futuros');
    console.log('   4. Verifica que los productos de consignación tengan correctamente asignado el consignor_id');

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  }
}

// Ejecutar el script
fixConsignorZeroBalance().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});