const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProductNamesFix() {
  console.log('=== Probando corrección de nombres de productos ===\n');

  try {
    // 1. Obtener ventas recientes para verificar nombres de productos
    console.log('1. Obteniendo ventas recientes...');
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (salesError) {
      console.error('Error al obtener ventas:', salesError);
      return;
    }

    console.log(`Se encontraron ${sales?.length || 0} ventas recientes`);

    // 2. Analizar cada venta para verificar nombres de productos
    for (const sale of sales || []) {
      console.log(`\n--- Analizando venta ${sale.saleId} ---`);
      console.log(`Fecha: ${sale.created_at}`);
      console.log(`Items: ${sale.items?.length || 0}`);

      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          console.log(`\nItem: ${item.productId}`);
          console.log(`  Nombre en venta: ${item.name || item.productName || 'SIN NOMBRE'}`);
          
          // Verificar el nombre real del producto en la base de datos
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('name, cost')
            .eq('firestore_id', item.productId)
            .single();

          if (productError) {
            console.log(`  Error al obtener producto: ${productError.message}`);
          } else if (product) {
            console.log(`  Nombre real: ${product.name}`);
            console.log(`  Costo: ${product.cost}`);
            
            // Verificar si los nombres coinciden
            const saleItemName = item.name || item.productName || '';
            if (saleItemName !== product.name) {
              console.log(`  ⚠️  LOS NOMBRES NO COINCIDEN`);
            } else {
              console.log(`  ✅ Los nombres coinciden correctamente`);
            }
          }
        }
      }
    }

    // 3. Verificar costos de consignadores
    console.log('\n\n=== Verificando costos de consignadores ===');
    
    // Obtener consignadores con ventas
    const { data: consignors, error: consignorsError } = await supabase
      .from('consignors')
      .select('id, name, balanceDue')
      .gt('balanceDue', 0);

    if (consignorsError) {
      console.error('Error al obtener consignadores:', consignorsError);
      return;
    }

    console.log(`Se encontraron ${consignors?.length || 0} consignadores con balance pendiente`);

    for (const consignor of consignors || []) {
      console.log(`\n--- Consignador: ${consignor.name} ---`);
      console.log(`ID: ${consignor.id}`);
      console.log(`Balance actual: ${consignor.balanceDue}`);

      // Obtener ventas de este consignador
      const { data: consignorSales, error: consignorSalesError } = await supabase
        .from('sales')
        .select('*')
        .contains('items', [{ consignorId: consignor.id }]);

      if (consignorSalesError) {
        console.log(`Error al obtener ventas del consignador: ${consignorSalesError.message}`);
        continue;
      }

      let totalExpectedCost = 0;
      
      for (const sale of consignorSales || []) {
        for (const item of sale.items || []) {
          if (item.consignorId === consignor.id) {
            // Obtener el costo real del producto
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('cost')
              .eq('firestore_id', item.productId)
              .single();

            if (!productError && product) {
              const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
              totalExpectedCost += itemCost;
            }
          }
        }
      }

      console.log(`Costo total esperado por ventas: ${totalExpectedCost}`);
      
      // Comparar con el balance actual
      const difference = Math.abs(consignor.balanceDue - totalExpectedCost);
      if (difference > 0.01) { // Permitir pequeñas diferencias por redondeo
        console.log(`⚠️  DIFERENCIA DETECTADA: ${difference}`);
      } else {
        console.log(`✅ El balance coincide con el costo esperado`);
      }
    }

    console.log('\n=== Prueba completada ===');

  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

// Ejecutar la prueba
testProductNamesFix();