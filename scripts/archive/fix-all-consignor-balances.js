// Script para solucionar todos los problemas de balances de consignadores
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

console.log('🔧 Solucionando Problemas de Balances de Consignadores');
console.log('===================================================\n');

async function fixAllConsignorBalances() {
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

    // 2. Obtener todos los productos
    console.log('\n2. 📦 Obteniendo todos los productos...');
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      console.error('   ❌ Error al obtener productos:', productsError);
      return;
    }

    console.log(`   ✓ Se encontraron ${allProducts.length} productos`);

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

    // 4. Solucionar productos de consignación sin consignor_id
    console.log('\n4. 🔧 Solucionando productos de consignación sin consignor_id...');
    
    const consignmentProducts = allProducts.filter(p => p.ownership_type === 'Consigna');
    const productsWithoutConsignor = consignmentProducts.filter(p => 
      !p.consignor_id || p.consignor_id === '' || p.consignor_id === null
    );
    
    if (productsWithoutConsignor.length > 0) {
      console.log(`   ❌ Se encontraron ${productsWithoutConsignor.length} productos de consignación sin consignor_id`);
      
      // Intentar asignar consignor_id basado en el nombre del producto
      for (const product of productsWithoutConsignor) {
        // Buscar un consignador que coincida con el nombre del producto
        const consignor = consignors.find(c => 
          product.name.toLowerCase().includes(c.name.toLowerCase()) ||
          product.sku.toLowerCase().includes(c.name.toLowerCase().replace(' ', ''))
        );
        
        if (consignor) {
          console.log(`      Asignando consignor ${consignor.name} a producto ${product.name}`);
          
          const { error: updateError } = await supabase
            .from('products')
            .update({
              consignor_id: consignor.id
            })
            .eq('id', product.id);
          
          if (updateError) {
            console.error(`         ❌ Error al actualizar producto: ${updateError.message}`);
          } else {
            console.log(`         ✓ Producto actualizado correctamente`);
          }
        } else {
          console.log(`      ⚠️  No se encontró consignador para producto ${product.name}`);
        }
      }
    } else {
      console.log(`   ✓ Todos los productos de consignación tienen consignor_id`);
    }

    // 5. Solucionar productos de consignación con consignor_id inválido
    console.log('\n5. 🔧 Solucionando productos de consignación con consignor_id inválido...');
    
    const validConsignorIds = consignors.map(c => c.id);
    const productsWithInvalidConsignor = consignmentProducts.filter(p => 
      p.consignor_id && !validConsignorIds.includes(p.consignor_id)
    );
    
    if (productsWithInvalidConsignor.length > 0) {
      console.log(`   ❌ Se encontraron ${productsWithInvalidConsignor.length} productos con consignor_id inválido`);
      
      for (const product of productsWithInvalidConsignor) {
        // Buscar un consignador que coincida con el nombre
        const consignor = consignors.find(c => 
          product.name.toLowerCase().includes(c.name.toLowerCase()) ||
          product.sku.toLowerCase().includes(c.name.toLowerCase().replace(' ', ''))
        );
        
        if (consignor) {
          console.log(`      Corrigiendo consignor de producto ${product.name}`);
          
          const { error: updateError } = await supabase
            .from('products')
            .update({
              consignor_id: consignor.id
            })
            .eq('id', product.id);
          
          if (updateError) {
            console.error(`         ❌ Error al actualizar producto: ${updateError.message}`);
          } else {
            console.log(`         ✓ Producto corregido correctamente`);
          }
        } else {
          console.log(`      ⚠️  No se encontró consignador para producto ${product.name}`);
        }
      }
    } else {
      console.log(`   ✓ No hay productos con consignor_id inválido`);
    }

    // 6. Recalcular y actualizar balances de consignadores
    console.log('\n6. 🔄 Recalculando y actualizando balances de consignadores...');
    
    let totalConsignorsFixed = 0;
    let totalCostsFixed = 0;
    
    for (const consignor of consignors) {
      console.log(`\n   📊 Procesando consignador: ${consignor.name} (ID: ${consignor.id})`);
      
      // 6.1. Obtener productos de este consignador
      const consignorProducts = allProducts.filter(p => p.consignor_id === consignor.id);
      console.log(`      Productos en consigna: ${consignorProducts.length}`);
      
      if (consignorProducts.length === 0) {
        console.log(`      ℹ️  No tiene productos de consignación`);
        continue;
      }
      
      // 6.2. Calcular el balance esperado basado en todas las ventas
      let expectedBalance = 0;
      let salesProcessed = 0;
      
      for (const sale of allSales) {
        const items = sale.items || [];
        
        for (const item of items) {
          // Buscar el producto en la base de datos
          const product = consignorProducts.find(p => 
            (p.firestore_id === item.productId || p.id === item.productId)
          );
          
          if (product) {
            // Calcular el costo del item
            const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
            expectedBalance += itemCost;
            salesProcessed++;
            
            // 6.3. Verificar si el item necesita ser actualizado
            if (!item.consignorId || item.consignorId !== consignor.id) {
              console.log(`         - Venta ${sale.saleId}: Item sin consignorId`);
              
              // Actualizar la venta para incluir el consignorId correcto
              const updatedItems = sale.items.map(saleItem => {
                if (saleItem.productId === item.productId) {
                  return {
                    ...saleItem,
                    consignorId: consignor.id
                  };
                }
                return saleItem;
              });
              
              const { error: updateError } = await supabase
                .from('sales')
                .update({
                  items: updatedItems
                })
                .eq('id', sale.id);
              
              if (updateError) {
                console.error(`            ❌ Error al actualizar venta: ${updateError.message}`);
              } else {
                console.log(`            ✓ Venta actualizada`);
              }
            }
          }
        }
      }
      
      const currentBalance = parseFloat(consignor.balanceDue || 0);
      const difference = Math.abs(currentBalance - expectedBalance);
      
      console.log(`      Ventas procesadas: ${salesProcessed}`);
      console.log(`      Balance actual: $${currentBalance.toFixed(2)}`);
      console.log(`      Balance esperado: $${expectedBalance.toFixed(2)}`);
      console.log(`      Diferencia: $${difference.toFixed(2)}`);
      
      // 6.4. Actualizar el balance del consignador si hay diferencia
      if (difference > 0.01) {
        const { error: balanceUpdateError } = await supabase
          .from('consignors')
          .update({
            balanceDue: expectedBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', consignor.id);
        
        if (balanceUpdateError) {
          console.error(`         ❌ Error al actualizar balance: ${balanceUpdateError.message}`);
        } else {
          console.log(`         ✓ Balance actualizado: $${currentBalance.toFixed(2)} → $${expectedBalance.toFixed(2)}`);
          totalConsignorsFixed++;
          totalCostsFixed += difference;
        }
      } else {
        console.log(`      ✅ Balance correcto`);
      }
    }

    // 7. Verificar si hay ventas con productos de consignación sin consignorId
    console.log('\n7. 🔍 Verificando ventas con productos de consignación sin consignorId...');
    
    let salesToUpdate = 0;
    
    for (const sale of allSales) {
      const items = sale.items || [];
      let saleNeedsUpdate = false;
      let updatedItems = [...items];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Buscar el producto en la base de datos
        const product = consignmentProducts.find(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (product && !item.consignorId) {
          // Buscar el consignador del producto
          const consignor = consignors.find(c => c.id === product.consignor_id);
          
          if (consignor) {
            updatedItems[i] = {
              ...item,
              consignorId: consignor.id
            };
            saleNeedsUpdate = true;
          }
        }
      }
      
      if (saleNeedsUpdate) {
        salesToUpdate++;
        
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            items: updatedItems
          })
          .eq('id', sale.id);
        
        if (updateError) {
          console.error(`   ❌ Error al actualizar venta ${sale.saleId}: ${updateError.message}`);
        } else {
          console.log(`   ✓ Venta actualizada: ${sale.saleId}`);
        }
      }
    }
    
    console.log(`   Ventas actualizadas: ${salesToUpdate}`);

    // 8. Resumen final
    console.log('\n✅ Solución completada');
    console.log('\n📊 Resumen de correcciones:');
    console.log(`   - Consignadores procesados: ${consignors.length}`);
    console.log(`   - Consignadores con balances corregidos: ${totalConsignorsFixed}`);
    console.log(`   - Costos totales corregidos: $${totalCostsFixed.toFixed(2)}`);
    console.log(`   - Productos sin consignor_id: ${productsWithoutConsignor.length}`);
    console.log(`   - Productos con consignor_id inválido: ${productsWithInvalidConsignor.length}`);
    console.log(`   - Ventas con items sin consignorId actualizadas: ${salesToUpdate}`);

    // 9. Verificación final
    console.log('\n🔍 Verificación final...');
    const { data: finalConsignors, error: finalConsignorsError } = await supabase
      .from('consignors')
      .select('*')
      .order('name', { ascending: true });

    if (!finalConsignorsError && finalConsignors) {
      console.log('   Balances finales de consignadores:');
      
      for (const consignor of finalConsignors) {
        const balance = parseFloat(consignor.balanceDue || 0);
        const status = balance > 0 ? '✅' : '⚠️';
        console.log(`   ${status} ${consignor.name}: $${balance.toFixed(2)}`);
        
        // Verificar si este consignador tiene productos pero balance en cero
        const consignorProducts = allProducts.filter(p => p.consignor_id === consignor.id);
        if (consignorProducts.length > 0 && balance === 0) {
          console.log(`      ⚠️  Tiene ${consignorProducts.length} productos pero balance en $0`);
        }
      }
    }

    console.log('\n💡 Recomendaciones:');
    console.log('   1. Verifica que los balances se hayan actualizado correctamente');
    console.log('   2. Realiza una venta de prueba con un producto de consignación');
    console.log('   3. Verifica que el balance del consignador se actualice después de la venta');
    console.log('   4. Monitorea los balances de consignadores regularmente');

  } catch (error) {
    console.error('❌ Error durante la solución:', error);
  }
}

// Ejecutar la solución
fixAllConsignorBalances().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});