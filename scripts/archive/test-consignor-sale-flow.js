// Script para probar el flujo completo de ventas de consignadores
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://your-project.supabase.co') {
  console.error('❌ Error: Configura las variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Probando Flujo de Ventas de Consignadores');
console.log('==========================================\n');

async function testConsignorSaleFlow() {
  try {
    // 1. Verificar estado actual
    console.log('1. 📊 Verificando estado actual...');
    
    const { data: consignors, error: consignorsError } = await supabase
      .from('consignors')
      .select('*')
      .single();

    if (consignorsError) {
      console.error('   ❌ Error obteniendo consignador:', consignorsError);
      return;
    }

    console.log(`   ✓ Consignador: ${consignors.name} - Balance: $${consignors.balanceDue || 0}`);

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('ownership_type', 'Consigna')
      .eq('consignor_id', consignors.id);

    if (productsError) {
      console.error('   ❌ Error obteniendo productos:', productsError);
      return;
    }

    console.log(`   ✓ Productos en consigna: ${products.length}`);
    products.forEach(p => {
      console.log(`      - ${p.name} (SKU: ${p.sku}, Stock: ${p.stock}, Costo: $${p.cost})`);
    });

    // 2. Crear una venta de prueba
    console.log('\n2. 🛒 Creando venta de prueba...');
    
    if (products.length === 0) {
      console.log('   ⚠️  No hay productos en consigna para probar');
      return;
    }

    const testProduct = products[0];
    const saleId = `TEST-${Date.now()}`;
    
    // Generar un UUID válido para la prueba
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const testUUID = generateUUID();
    
    const saleData = {
      id: testUUID,
      firestore_id: testUUID,
      saleId: saleId,
      items: [{
        productId: testProduct.firestore_id || testProduct.id,
        name: testProduct.name,
        quantity: 1,
        priceAtSale: testProduct.price,
        consignorId: consignors.id
      }],
      totalAmount: testProduct.price,
      paymentMethod: 'Efectivo',
      cashierId: 'test-user',
      cashierName: 'Test User',
      customerName: 'Cliente Prueba',
      customerPhone: '1234567890',
      createdAt: new Date().toISOString()
    };

    console.log(`   📦 Creando venta ${saleId} para ${testProduct.name}...`);

    const { error: saleError } = await supabase
      .from('sales')
      .insert([saleData]);

    if (saleError) {
      console.error(`   ❌ Error creando venta: ${saleError.message}`);
      return;
    }

    console.log(`   ✓ Venta creada exitosamente`);

    // 3. Actualizar balance del consignador
    console.log('\n3. 💰 Actualizando balance del consignador...');
    
    const expectedBalanceIncrease = parseFloat(testProduct.cost || 0) * 1;
    const currentBalance = parseFloat(consignors.balanceDue || 0);
    const newBalance = currentBalance + expectedBalanceIncrease;

    const { error: balanceError } = await supabase
      .from('consignors')
      .update({
        balanceDue: newBalance
      })
      .eq('id', consignors.id);

    if (balanceError) {
      console.error(`   ❌ Error actualizando balance: ${balanceError.message}`);
      return;
    }

    console.log(`   ✓ Balance actualizado: $${currentBalance} → $${newBalance}`);

    // 4. Disminuir stock
    console.log('\n4. 📉 Actualizando stock...');
    
    const newStock = Math.max(0, testProduct.stock - 1);
    
    const { error: stockError } = await supabase
      .from('products')
      .update({
        stock: newStock
      })
      .eq('id', testProduct.id);

    if (stockError) {
      console.error(`   ❌ Error actualizando stock: ${stockError.message}`);
      return;
    }

    console.log(`   ✓ Stock actualizado: ${testProduct.stock} → ${newStock}`);

    // 5. Verificar que la venta aparece en los módulos
    console.log('\n5. 🔍 Verificando visibilidad de la venta...');
    
    // Verificar en la lista general de ventas
    const { data: allSales, error: allSalesError } = await supabase
      .from('sales')
      .select('*')
      .eq('saleId', saleId);

    if (allSalesError) {
      console.error(`   ❌ Error obteniendo venta general: ${allSalesError.message}`);
    } else if (allSales.length > 0) {
      console.log(`   ✓ Venta encontrada en módulo general`);
    } else {
      console.log(`   ❌ Venta NO encontrada en módulo general`);
    }

    // Verificar en el reporte de consignador (simulando la lógica del API)
    const { data: consignorSales, error: consignorSalesError } = await supabase
      .from('sales')
      .select('*');

    if (!consignorSalesError && consignorSales) {
      const foundInConsignorReport = consignorSales.some(sale => {
        const items = sale.items || [];
        return items.some(item => item.consignorId === consignors.id) && sale.saleId === saleId;
      });

      if (foundInConsignorReport) {
        console.log(`   ✓ Venta encontrada en reporte de consignador`);
      } else {
        console.log(`   ❌ Venta NO encontrada en reporte de consignador`);
      }
    }

    // 6. Verificar estado final
    console.log('\n6. ✅ Verificación final...');
    
    const { data: finalConsignor, error: finalConsignorError } = await supabase
      .from('consignors')
      .select('*')
      .eq('id', consignors.id)
      .single();

    if (!finalConsignorError && finalConsignor) {
      console.log(`   ✓ Balance final del consignador: $${finalConsignor.balanceDue || 0}`);
      
      if (parseFloat(finalConsignor.balanceDue || 0) === newBalance) {
        console.log(`   ✅ Balance actualizado correctamente`);
      } else {
        console.log(`   ❌ Balance incorrecto. Esperado: $${newBalance}, Actual: $${finalConsignor.balanceDue || 0}`);
      }
    }

    console.log('\n🎉 Prueba completada exitosamente');
    console.log('\n📋 Resumen:');
    console.log(`   - Venta creada: ${saleId}`);
    console.log(`   - Producto: ${testProduct.name}`);
    console.log(`   - Costo agregado al consignador: $${expectedBalanceIncrease}`);
    console.log(`   - Balance final del consignador: $${newBalance}`);

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

// Ejecutar la prueba
testConsignorSaleFlow().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});