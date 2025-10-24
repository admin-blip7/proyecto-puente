// Script para verificar si los productos tienen correctamente asignado el consignor_id
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

console.log('🔍 Verificando Asignaciones de Consignadores a Productos');
console.log('==================================================\n');

async function verifyConsignorProductAssignments() {
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

    // 3. Analizar productos de consignación
    console.log('\n3. 🔍 Analizando productos de consignación...');
    
    const consignmentProducts = allProducts.filter(p => p.ownership_type === 'Consigna');
    console.log(`   ✓ Se encontraron ${consignmentProducts.length} productos de consignación`);
    
    // 3.1. Verificar productos de consignación sin consignor_id
    const productsWithoutConsignor = consignmentProducts.filter(p => 
      !p.consignor_id || p.consignor_id === '' || p.consignor_id === null
    );
    
    if (productsWithoutConsignor.length > 0) {
      console.log(`   ❌ Se encontraron ${productsWithoutConsignor.length} productos de consignación sin consignor_id:`);
      productsWithoutConsignor.forEach(product => {
        console.log(`      - ${product.name} (SKU: ${product.sku}, ID: ${product.id})`);
      });
    } else {
      console.log(`   ✓ Todos los productos de consignación tienen consignor_id asignado`);
    }
    
    // 3.2. Verificar productos de consignación con consignor_id inválido
    const productsWithInvalidConsignor = [];
    const validConsignorIds = consignors.map(c => c.id);
    
    for (const product of consignmentProducts) {
      if (product.consignor_id && !validConsignorIds.includes(product.consignor_id)) {
        productsWithInvalidConsignor.push(product);
      }
    }
    
    if (productsWithInvalidConsignor.length > 0) {
      console.log(`   ❌ Se encontraron ${productsWithInvalidConsignor.length} productos de consignación con consignor_id inválido:`);
      productsWithInvalidConsignor.forEach(product => {
        console.log(`      - ${product.name} (SKU: ${product.sku}, ID: ${product.id}, ConsignorId: ${product.consignor_id})`);
      });
    } else {
      console.log(`   ✓ Todos los productos de consignación tienen consignor_id válido`);
    }
    
    // 4. Agrupar productos por consignador
    console.log('\n4. 📊 Agrupando productos por consignador...');
    
    const productsByConsignor = {};
    
    for (const consignor of consignors) {
      productsByConsignor[consignor.id] = {
        consignor,
        products: []
      };
    }
    
    for (const product of consignmentProducts) {
      if (product.consignor_id && productsByConsignor[product.consignor_id]) {
        productsByConsignor[product.consignor_id].products.push(product);
      }
    }
    
    for (const [consignorId, data] of Object.entries(productsByConsignor)) {
      console.log(`   📋 ${data.consignor.name}:`);
      console.log(`      - Productos en consigna: ${data.products.length}`);
      console.log(`      - Balance actual: $${data.consignor.balanceDue || 0}`);
      
      if (data.products.length > 0) {
        console.log(`      - Productos:`);
        data.products.slice(0, 3).forEach(product => {
          console.log(`        * ${product.name} (SKU: ${product.sku}, Costo: $${product.cost}, Stock: ${product.stock})`);
        });
        
        if (data.products.length > 3) {
          console.log(`        ... y ${data.products.length - 3} más`);
        }
      }
    }
    
    // 5. Obtener ventas recientes
    console.log('\n5. 💰 Obteniendo ventas recientes...');
    const { data: recentSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (salesError) {
      console.error('   ❌ Error al obtener ventas:', salesError);
      return;
    }

    console.log(`   ✓ Se encontraron ${recentSales.length} ventas recientes`);
    
    // 6. Analizar ventas con productos de consignación
    console.log('\n6. 🔍 Analizando ventas con productos de consignación...');
    
    let salesWithConsignorItems = 0;
    let salesWithoutConsignorId = 0;
    let salesWithInvalidConsignorId = 0;
    let totalExpectedCost = 0;
    
    for (const sale of recentSales) {
      const items = sale.items || [];
      let hasConsignorItems = false;
      let saleHasIssues = false;
      
      for (const item of items) {
        // Verificar si el producto es de consignación
        const product = consignmentProducts.find(p => 
          (p.firestore_id === item.productId || p.id === item.productId)
        );
        
        if (product) {
          hasConsignorItems = true;
          
          // Verificar si el item tiene consignorId
          if (!item.consignorId) {
            salesWithoutConsignorId++;
            saleHasIssues = true;
            console.log(`      ⚠️  Venta ${sale.saleId}: Item sin consignorId`);
            console.log(`         - Producto: ${item.name}`);
            console.log(`         - ProductId: ${item.productId}`);
            console.log(`         - ConsignorId esperado: ${product.consignor_id}`);
          } else if (item.consignorId !== product.consignor_id) {
            salesWithInvalidConsignorId++;
            saleHasIssues = true;
            console.log(`      ⚠️  Venta ${sale.saleId}: Item con consignorId incorrecto`);
            console.log(`         - Producto: ${item.name}`);
            console.log(`         - ProductId: ${item.productId}`);
            console.log(`         - ConsignorId en item: ${item.consignorId}`);
            console.log(`         - ConsignorId esperado: ${product.consignor_id}`);
          } else {
            // Calcular el costo esperado
            const itemCost = parseFloat(product.cost || 0) * (item.quantity || 1);
            totalExpectedCost += itemCost;
          }
        }
      }
      
      if (hasConsignorItems) {
        salesWithConsignorItems++;
        if (saleHasIssues) {
          console.log(`      ❌ Venta ${sale.saleId} tiene problemas`);
        }
      }
    }
    
    console.log(`   📊 Resumen de ventas:`);
    console.log(`      - Ventas con productos de consignación: ${salesWithConsignorItems}`);
    console.log(`      - Ventas con items sin consignorId: ${salesWithoutConsignorId}`);
    console.log(`      - Ventas con items con consignorId incorrecto: ${salesWithInvalidConsignorId}`);
    console.log(`      - Costo total esperado: $${totalExpectedCost.toFixed(2)}`);
    
    // 7. Verificar balances de consignadores
    console.log('\n7. 🏦 Verificando balances de consignadores...');
    
    let totalBalanceDue = 0;
    let consignorsWithZeroBalance = 0;
    let consignorsWithBalance = 0;
    
    for (const consignor of consignors) {
      const balance = parseFloat(consignor.balanceDue || 0);
      totalBalanceDue += balance;
      
      if (balance === 0) {
        consignorsWithZeroBalance++;
      } else {
        consignorsWithBalance++;
      }
    }
    
    console.log(`   📊 Resumen de balances:`);
    console.log(`      - Consignadores con balance en cero: ${consignorsWithZeroBalance}`);
    console.log(`      - Consignadores con balance mayor a cero: ${consignorsWithBalance}`);
    console.log(`      - Balance total de todos los consignadores: $${totalBalanceDue.toFixed(2)}`);
    
    // 8. Conclusiones y recomendaciones
    console.log('\n8. 💡 Conclusiones y recomendaciones...');
    
    if (productsWithoutConsignor.length > 0) {
      console.log(`   ❌ Se encontraron ${productsWithoutConsignor.length} productos de consignación sin consignor_id`);
      console.log(`   💡 Recomendación: Asigna correctamente el consignor_id a estos productos`);
    }
    
    if (productsWithInvalidConsignor.length > 0) {
      console.log(`   ❌ Se encontraron ${productsWithInvalidConsignor.length} productos de consignación con consignor_id inválido`);
      console.log(`   💡 Recomendación: Corrige los consignor_id de estos productos`);
    }
    
    if (salesWithoutConsignorId > 0) {
      console.log(`   ❌ Se encontraron ${salesWithoutConsignorId} ventas con items sin consignorId`);
      console.log(`   💡 Recomendación: Ejecuta el script de reparación para corregir estas ventas`);
    }
    
    if (salesWithInvalidConsignorId > 0) {
      console.log(`   ❌ Se encontraron ${salesWithInvalidConsignorId} ventas con items con consignorId incorrecto`);
      console.log(`   💡 Recomendación: Ejecuta el script de reparación para corregir estas ventas`);
    }
    
    if (consignorsWithZeroBalance > 0 && totalExpectedCost > 0) {
      console.log(`   ❌ Hay ${consignorsWithZeroBalance} consignadores con balance en cero pero con ventas esperadas`);
      console.log(`   💡 Recomendación: Ejecuta el script de reparación para actualizar los balances`);
    }
    
    if (productsWithoutConsignor.length === 0 && 
        productsWithInvalidConsignor.length === 0 && 
        salesWithoutConsignorId === 0 && 
        salesWithInvalidConsignorId === 0) {
      console.log(`   ✅ No se encontraron problemas significativos`);
      console.log(`   💡 Recomendación: El sistema parece estar configurado correctamente`);
    }

    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar la verificación
verifyConsignorProductAssignments().then(() => {
  console.log('\n🏁 Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});