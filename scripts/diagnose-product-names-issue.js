const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseProductNamesIssue() {
  console.log('=== Diagnóstico del Problema de Nombres de Productos ===\n');
  
  try {
    // 1. Obtener ventas recientes
    console.log('1. Analizando ventas recientes...');
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(20);
    
    if (salesError) {
      console.error('   ✗ Error al obtener ventas:', salesError);
      return;
    }
    
    console.log(`   ✓ Se analizaron ${sales.length} ventas recientes`);
    
    // 2. Identificar ventas con productos desconocidos
    console.log('\n2. Identificando ventas con productos desconocidos...');
    const salesWithUnknownProducts = [];
    
    for (const sale of sales) {
      if (!sale.items || !Array.isArray(sale.items)) continue;
      
      const hasUnknownProduct = sale.items.some(item => 
        !item.name || 
        item.name.trim() === '' || 
        item.name === 'Producto desconocido'
      );
      
      if (hasUnknownProduct) {
        salesWithUnknownProducts.push(sale);
      }
    }
    
    console.log(`   ✓ Se encontraron ${salesWithUnknownProducts.length} ventas con productos desconocidos`);
    
    if (salesWithUnknownProducts.length === 0) {
      console.log('\n✓ No se encontraron ventas con productos desconocidos en las últimas 20 ventas.');
      return;
    }
    
    // 3. Analizar en detalle las ventas con problemas
    console.log('\n3. Analizando en detalle las ventas con problemas...');
    
    for (const sale of salesWithUnknownProducts) {
      console.log(`\n   Venta: ${sale.saleId} (${sale.createdAt})`);
      
      if (!sale.items || !Array.isArray(sale.items)) {
        console.log('   ✗ La venta no tiene items o no es un array');
        continue;
      }
      
      console.log(`   Items (${sale.items.length}):`);
      
      for (const item of sale.items) {
        console.log(`      - Producto ID: ${item.productId || 'N/A'}`);
        console.log(`        Nombre: "${item.name || 'N/A'}"`);
        console.log(`        Cantidad: ${item.quantity || 'N/A'}`);
        console.log(`        Precio: ${item.priceAtSale || item.price || 'N/A'}`);
        console.log(`        Consignador: ${item.consignorId || 'N/A'}`);
        
        // Verificar si el producto existe en la base de datos
        if (item.productId) {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name, sku, ownership_type, consignor_id')
            .or(`id.eq.${item.productId},firestore_id.eq.${item.productId}`)
            .maybeSingle();
          
          if (productError) {
            console.log(`        ✗ Error al buscar producto: ${productError.message}`);
          } else if (product) {
            console.log(`        ✓ Producto encontrado en BD: "${product.name}" (SKU: ${product.sku})`);
            console.log(`        ⚠ El nombre en la venta es diferente al nombre en la BD`);
          } else {
            console.log(`        ✗ Producto no encontrado en la base de datos`);
          }
        } else {
          console.log(`        ✗ El item no tiene productId`);
        }
      }
    }
    
    // 4. Verificar si hay un patrón en los productos afectados
    console.log('\n4. Buscando patrones en los productos afectados...');
    
    const unknownProductIds = new Set();
    const unknownProductSkus = new Set();
    
    for (const sale of salesWithUnknownProducts) {
      if (!sale.items || !Array.isArray(sale.items)) continue;
      
      for (const item of sale.items) {
        if (!item.name || item.name.trim() === '' || item.name === 'Producto desconocido') {
          if (item.productId) unknownProductIds.add(item.productId);
          // Intentar obtener SKU de los items
          if (item.sku) unknownProductSkus.add(item.sku);
        }
      }
    }
    
    console.log(`   Product IDs afectados: ${Array.from(unknownProductIds).join(', ')}`);
    console.log(`   SKUs afectados: ${Array.from(unknownProductSkus).join(', ')}`);
    
    // 5. Verificar si estos productos existen en la base de datos
    console.log('\n5. Verificando si los productos afectados existen en la base de datos...');
    
    for (const productId of Array.from(unknownProductIds)) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, sku, ownership_type, consignor_id')
        .or(`id.eq.${productId},firestore_id.eq.${productId}`)
        .maybeSingle();
      
      if (productError) {
        console.log(`   ✗ Error al buscar producto ${productId}: ${productError.message}`);
      } else if (product) {
        console.log(`   ✓ Producto ${productId} existe: "${product.name}" (SKU: ${product.sku})`);
      } else {
        console.log(`   ✗ Producto ${productId} no existe en la base de datos`);
      }
    }
    
    // 6. Verificar logs de inventario para estos productos
    console.log('\n6. Verificando logs de inventario para productos afectados...');
    
    for (const productId of Array.from(unknownProductIds).slice(0, 5)) { // Limitar a 5 para no sobrecargar
      const { data: logs, error: logsError } = await supabase
        .from('inventory_logs')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (logsError) {
        console.log(`   ✗ Error al buscar logs para ${productId}: ${logsError.message}`);
      } else if (logs && logs.length > 0) {
        console.log(`   Logs para ${productId}:`);
        for (const log of logs) {
          console.log(`      - ${log.created_at}: ${log.reason} - "${log.product_name}"`);
        }
      } else {
        console.log(`   No se encontraron logs para ${productId}`);
      }
    }
    
    console.log('\n=== Diagnóstico Completado ===');
    
    // Resumen
    if (salesWithUnknownProducts.length > 0) {
      console.log(`\n⚠ Se encontraron ${salesWithUnknownProducts.length} ventas con productos desconocidos.`);
      console.log('Posibles causas:');
      console.log('1. Los productos fueron eliminados después de la venta');
      console.log('2. Hubo un error al guardar el nombre del producto durante la venta');
      console.log('3. Los IDs de producto no coinciden entre la venta y la base de datos');
      console.log('4. Problema en el mapeo de datos durante el proceso de venta');
    } else {
      console.log('\n✓ No se encontraron problemas significativos en las ventas recientes.');
    }
    
  } catch (error) {
    console.error('Error durante el diagnóstico:', error);
  }
}

// Ejecutar el diagnóstico
diagnoseProductNamesIssue();