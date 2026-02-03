// Script para reparar las ventas de consignadores
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('❌ Error: Configura las variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Reparando Ventas de Consignadores');
console.log('===================================\n');

async function fixConsignorSales() {
  try {
    // 1. Obtener todas las ventas con productos de consignadores
    console.log('1. 📋 Obteniendo ventas con productos de consignadores...');
    
    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('createdAt', { ascending: false });

    if (salesError) {
      console.error('   ❌ Error al obtener ventas:', salesError);
      return;
    }

    console.log(`   ✓ Se encontraron ${allSales.length} ventas totales`);

    // 2. Identificar ventas con productos de consignadores
    const consignorSales = [];
    allSales.forEach(sale => {
      const items = sale.items || [];
      const hasConsignorItems = items.some(item => item.consignorId);
      if (hasConsignorItems) {
        consignorSales.push(sale);
      }
    });

    console.log(`   ✓ Se encontraron ${consignorSales.length} ventas con productos de consignadores`);

    // 3. Obtener información de productos para corregir nombres
    console.log('\n3. 📦 Obteniendo información de productos...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*');

    if (productsError) {
      console.error('   ❌ Error al obtener productos:', productsError);
      return;
    }

    console.log(`   ✓ Se obtuvieron ${products.length} productos`);

    // 4. Procesar cada venta de consignador
    console.log('\n4. 🔧 Procesando ventas de consignadores...');
    
    let totalFixed = 0;
    let totalBalanceUpdated = 0;
    
    for (const sale of consignorSales) {
      console.log(`\n   📋 Procesando venta: ${sale.saleId}`);
      
      const items = sale.items || [];
      let needsUpdate = false;
      let updatedItems = [];
      let consignorUpdates = [];

      for (const item of items) {
        if (item.consignorId) {
          // Buscar el producto para obtener el nombre correcto y el costo
          const product = products.find(p => 
            (p.firestore_id === item.productId || p.id === item.productId)
          );

          if (product) {
            // Verificar si el nombre es incorrecto (empieza con "Producto ID:")
            const itemNameNeedsFix = item.name && item.name.startsWith('Producto ID:');
            
            // Crear item actualizado
            const updatedItem = {
              ...item,
              name: itemNameNeedsFix ? product.name : item.name,
              cost: product.cost || 0
            };

            if (itemNameNeedsFix) {
              console.log(`      - Corrigiendo nombre: "${item.name}" → "${product.name}"`);
              needsUpdate = true;
            }

            updatedItems.push(updatedItem);

            // Si el item es de consignador, preparar actualización de balance
            if (item.consignorId) {
              consignorUpdates.push({
                consignorId: item.consignorId,
                cost: parseFloat(product.cost || 0) * (item.quantity || 1),
                productName: product.name
              });
            }
          } else {
            console.log(`      ⚠️  No se encontró el producto ${item.productId}`);
            updatedItems.push(item);
          }
        } else {
          updatedItems.push(item);
        }
      }

      // 5. Actualizar la venta si es necesario
      if (needsUpdate) {
        console.log(`      💾 Actualizando venta ${sale.saleId}...`);
        
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            items: updatedItems
          })
          .eq('id', sale.id);

        if (updateError) {
          console.error(`         ❌ Error actualizando venta: ${updateError.message}`);
        } else {
          console.log(`         ✓ Venta actualizada correctamente`);
          totalFixed++;
        }
      }

      // 6. Actualizar balances de consignadores
      for (const update of consignorUpdates) {
        console.log(`      💰 Actualizando balance del consignador ${update.consignorId} por $${update.cost} (${update.productName})`);
        
        // Obtener balance actual
        const { data: currentConsignor, error: consignorError } = await supabase
          .from('consignors')
          .select('balanceDue')
          .eq('id', update.consignorId)
          .single();

        if (consignorError) {
          console.error(`         ❌ Error obteniendo balance del consignador: ${consignorError.message}`);
          continue;
        }

        const currentBalance = parseFloat(currentConsignor.balanceDue || 0);
        const newBalance = currentBalance + update.cost;

        // Actualizar balance
        const { error: balanceUpdateError } = await supabase
          .from('consignors')
          .update({
            balanceDue: newBalance
          })
          .eq('id', update.consignorId);

        if (balanceUpdateError) {
          console.error(`         ❌ Error actualizando balance: ${balanceUpdateError.message}`);
        } else {
          console.log(`         ✓ Balance actualizado: $${currentBalance} → $${newBalance}`);
          totalBalanceUpdated++;
        }
      }
    }

    // 7. Resumen final
    console.log('\n✅ Proceso completado');
    console.log('\n📊 Resumen de cambios:');
    console.log(`   - Ventas corregidas: ${totalFixed}`);
    console.log(`   - Balances de consignadores actualizados: ${totalBalanceUpdated}`);

    // 8. Verificación final
    console.log('\n🔍 Verificación final...');
    const { data: finalConsignors, error: finalConsignorsError } = await supabase
      .from('consignors')
      .select('*');

    if (!finalConsignorsError && finalConsignors) {
      finalConsignors.forEach(consignor => {
        console.log(`   - ${consignor.name}: $${consignor.balanceDue || 0}`);
      });
    }

  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
  }
}

// Ejecutar el script
fixConsignorSales().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});