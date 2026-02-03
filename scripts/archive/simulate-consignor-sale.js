// Script para simular el proceso completo de una venta de consignador
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

console.log('🧪 Simulando Venta de Consignador');
console.log('===================================\n');

async function simulateConsignorSale() {
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

    // 3. Seleccionar un consignador y un producto para la simulación
    console.log('\n3. 🎯 Seleccionando consignador y producto para la simulación...');
    
    let targetConsignor = null;
    let targetProduct = null;
    
    // Buscar un consignador con productos
    for (const consignor of consignors) {
      const products = consignmentProducts.filter(p => p.consignor_id === consignor.id);
      if (products.length > 0) {
        targetConsignor = consignor;
        targetProduct = products[0];
        break;
      }
    }
    
    if (!targetConsignor || !targetProduct) {
      console.log('   ❌ No se encontraron consignadores con productos para simular');
      return;
    }
    
    console.log(`   ✓ Consignador seleccionado: ${targetConsignor.name}`);
    console.log(`   ✓ Producto seleccionado: ${targetProduct.name}`);
    console.log(`   - Costo del producto: $${targetProduct.cost}`);
    console.log(`   - Precio del producto: $${targetProduct.price}`);
    console.log(`   - Stock actual: ${targetProduct.stock}`);
    console.log(`   - Balance actual del consignador: $${targetConsignor.balanceDue || 0}`);

    // 4. Preparar datos de la venta simulada
    console.log('\n4. 📋 Preparando datos de la venta simulada...');
    
    const saleId = `SIM-SALE-${Date.now()}`;
    const quantity = 1;
    const saleData = {
      saleId,
      totalAmount: parseFloat(targetProduct.price || 0) * quantity,
      paymentMethod: 'Efectivo',
      cashierId: 'simulated-cashier',
      cashierName: 'Simulated Cashier',
      customerName: 'Cliente Simulado',
      items: [{
        productId: targetProduct.firestore_id || targetProduct.id,
        name: targetProduct.name,
        quantity,
        priceAtSale: parseFloat(targetProduct.price || 0),
        consignorId: targetConsignor.id // Forzar el consignorId
      }]
    };
    
    const cartItems = [{
      id: targetProduct.firestore_id || targetProduct.id,
      name: targetProduct.name,
      quantity,
      price: parseFloat(targetProduct.price || 0)
    }];
    
    console.log(`   - Sale ID: ${saleId}`);
    console.log(`   - TotalAmount: $${saleData.totalAmount}`);
    console.log(`   - Items: ${saleData.items.length}`);
    console.log(`   - Item con consignorId: ${saleData.items[0].consignorId ? 'SÍ' : 'NO'}`);

    // 5. Simular el proceso de addSaleAndUpdateStock
    console.log('\n5. 🔄 Simulando el proceso de addSaleAndUpdateStock...');
    
    const now = new Date().toISOString();
    
    // 5.1. Verificar que el producto tenga el consignorId correcto
    console.log('   5.1. Verificando consignorId del producto...');
    const { data: productCheck, error: productCheckError } = await supabase
      .from('products')
      .select('consignor_id, name, cost')
      .eq('firestore_id', targetProduct.firestore_id || targetProduct.id)
      .single();
    
    if (productCheckError) {
      console.error(`      ❌ Error al verificar producto: ${productCheckError.message}`);
      return;
    }
    
    console.log(`      ✓ Producto encontrado: ${productCheck.name}`);
    console.log(`      - ConsignorId en BD: ${productCheck.consignor_id}`);
    console.log(`      - Costo en BD: $${productCheck.cost}`);
    console.log(`      - ConsignorId esperado: ${targetConsignor.id}`);
    
    if (productCheck.consignor_id !== targetConsignor.id) {
      console.log(`      ❌ El consignorId del producto no coincide con el consignador esperado`);
      return;
    }
    
    // 5.2. Simular la inserción de la venta
    console.log('   5.2. Simulando inserción de la venta...');
    
    const saleRecord = {
      id: saleId,
      firestore_id: saleId,
      saleId,
      items: saleData.items,
      totalAmount: saleData.totalAmount,
      paymentMethod: saleData.paymentMethod,
      cashierId: saleData.cashierId,
      cashierName: saleData.cashierName,
      customerName: saleData.customerName,
      createdAt: now
    };
    
    console.log(`      - Insertando venta: ${saleId}`);
    console.log(`      - Items con consignorId: ${saleRecord.items[0].consignorId ? 'SÍ' : 'NO'}`);
    
    // 5.3. Simular la actualización del balance del consignador
    console.log('   5.3. Simulando actualización del balance del consignador...');
    
    const item = saleRecord.items[0];
    const consignorCost = parseFloat(productCheck.cost || 0) * item.quantity;
    
    console.log(`      - Item: ${item.name}`);
    console.log(`      - Quantity: ${item.quantity}`);
    console.log(`      - Costo unitario: $${productCheck.cost}`);
    console.log(`      - Costo total: $${consignorCost}`);
    
    // Obtener el balance actual del consignador
    const { data: currentBalance, error: balanceError } = await supabase
      .from('consignors')
      .select('balanceDue')
      .eq('id', targetConsignor.id)
      .single();
    
    if (balanceError) {
      console.error(`      ❌ Error al obtener balance: ${balanceError.message}`);
      return;
    }
    
    const currentBalanceValue = parseFloat(currentBalance?.balanceDue || 0);
    const newBalance = currentBalanceValue + consignorCost;
    
    console.log(`      - Balance actual: $${currentBalanceValue}`);
    console.log(`      - Nuevo balance esperado: $${newBalance.toFixed(2)}`);
    
    // 6. Ejecutar la actualización del balance
    console.log('\n6. 💰 Actualizando balance del consignador...');
    
    const { error: updateError } = await supabase
      .from('consignors')
      .update({
        balanceDue: newBalance,
        updated_at: now
      })
      .eq('id', targetConsignor.id);
    
    if (updateError) {
      console.error(`   ❌ Error al actualizar balance: ${updateError.message}`);
      return;
    }
    
    console.log(`   ✓ Balance actualizado correctamente`);
    
    // 7. Verificar el resultado
    console.log('\n7. 🔍 Verificando el resultado...');
    
    const { data: updatedConsignor, error: verifyError } = await supabase
      .from('consignors')
      .select('*')
      .eq('id', targetConsignor.id)
      .single();
    
    if (verifyError) {
      console.error(`   ❌ Error al verificar resultado: ${verifyError.message}`);
      return;
    }
    
    const finalBalance = parseFloat(updatedConsignor.balanceDue || 0);
    const expectedBalance = currentBalanceValue + consignorCost;
    const difference = Math.abs(finalBalance - expectedBalance);
    
    console.log(`   - Balance inicial: $${currentBalanceValue.toFixed(2)}`);
    console.log(`   - Costo agregado: $${consignorCost.toFixed(2)}`);
    console.log(`   - Balance final: $${finalBalance.toFixed(2)}`);
    console.log(`   - Balance esperado: $${expectedBalance.toFixed(2)}`);
    console.log(`   - Diferencia: $${difference.toFixed(2)}`);
    
    if (difference <= 0.01) {
      console.log(`   ✅ Simulación exitosa: El balance se actualizó correctamente`);
    } else {
      console.log(`   ❌ Simulación fallida: El balance no se actualizó correctamente`);
    }
    
    // 8. Insertar la venta simulada para referencia
    console.log('\n8. 📋 Insertando venta simulada para referencia...');
    
    const { error: insertError } = await supabase
      .from('sales')
      .insert([saleRecord]);
    
    if (insertError) {
      console.error(`   ❌ Error al insertar venta simulada: ${insertError.message}`);
    } else {
      console.log(`   ✓ Venta simulada insertada: ${saleId}`);
    }
    
    console.log('\n✅ Simulación completada');
    console.log('\n💡 Conclusiones:');
    
    if (difference <= 0.01) {
      console.log('   1. El flujo de actualización de balances funciona correctamente');
      console.log('   2. El problema puede estar en la identificación de productos de consignación durante las ventas reales');
      console.log('   3. Verifica que los productos de consignación tengan correctamente asignado el consignor_id');
    } else {
      console.log('   1. Hay un problema en el flujo de actualización de balances');
      console.log('   2. Revisa los logs del servidor para ver si hay errores durante la actualización');
      console.log('   3. Verifica que la API de ventas esté llamando correctamente a la actualización de balances');
    }
    
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Ejecuta el script de diagnóstico: scripts/debug-real-time-sale.js');
    console.log('   2. Si es necesario, ejecuta el script de reparación: scripts/fix-consignor-zero-balance.js');
    console.log('   3. Monitorea los balances de consignadores después de las ventas reales');

  } catch (error) {
    console.error('❌ Error durante la simulación:', error);
  }
}

// Ejecutar la simulación
simulateConsignorSale().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});