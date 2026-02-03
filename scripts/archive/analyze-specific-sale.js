const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeSpecificSale() {
  console.log('=== Análisis de Venta Específica ===\n');
  
  try {
    // Buscar una venta específica que muestre "Producto desconocido" en el frontend
    const saleId = 'CONSIG-1761163077597'; // Sale ID visible en los logs
    
    console.log(`1. Buscando venta con ID: ${saleId}`);
    
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('saleId', saleId)
      .maybeSingle();
    
    if (saleError || !sale) {
      console.error('   ✗ Error al obtener la venta:', saleError?.message || 'Venta no encontrada');
      return;
    }
    
    console.log(`   ✓ Venta encontrada: ${sale.saleId} (${sale.createdAt})`);
    console.log(`   Total: ${sale.totalAmount}`);
    console.log(`   Items: ${sale.items ? sale.items.length : 0}`);
    
    // Analizar los items de la venta
    if (!sale.items || !Array.isArray(sale.items)) {
      console.log('   ✗ La venta no tiene items o no es un array');
      return;
    }
    
    console.log('\n2. Analizando items de la venta:');
    
    for (let i = 0; i < sale.items.length; i++) {
      const item = sale.items[i];
      console.log(`\n   Item ${i + 1}:`);
      console.log(`      - Producto ID: ${item.productId || 'N/A'}`);
      console.log(`      - Nombre: "${item.name || 'N/A'}"`);
      console.log(`      - SKU: ${item.sku || 'N/A'}`);
      console.log(`      - Cantidad: ${item.quantity || 'N/A'}`);
      console.log(`      - Precio: ${item.priceAtSale || item.price || 'N/A'}`);
      console.log(`      - Costo: ${item.cost || 'N/A'}`);
      console.log(`      - Consignador: ${item.consignorId || 'N/A'}`);
      console.log(`      - Tipo de Propiedad: ${item.ownershipType || 'N/A'}`);
      
      // Verificar si el producto existe en la base de datos
      if (item.productId) {
        console.log(`\n   Verificando producto en la base de datos...`);
        
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .or(`id.eq.${item.productId},firestore_id.eq.${item.productId}`)
          .maybeSingle();
        
        if (productError) {
          console.log(`      ✗ Error al buscar producto: ${productError.message}`);
        } else if (product) {
          console.log(`      ✓ Producto encontrado en BD:`);
          console.log(`        - ID: ${product.id}`);
          console.log(`        - Nombre: "${product.name}"`);
          console.log(`        - SKU: ${product.sku}`);
          console.log(`        - Tipo: ${product.ownership_type}`);
          console.log(`        - Consignador: ${product.consignor_id}`);
          
          // Comparar nombres
          if (item.name && product.name && item.name !== product.name) {
            console.log(`      ⚠ El nombre en la venta ("${item.name}") es diferente al nombre en la BD ("${product.name}")`);
          } else if (!item.name || item.name.trim() === '' || item.name === 'Producto desconocido') {
            console.log(`      ✗ El nombre en la venta está vacío o es "Producto desconocido"`);
          } else {
            console.log(`      ✓ El nombre en la venta coincide con el nombre en la BD`);
          }
        } else {
          console.log(`      ✗ Producto no encontrado en la base de datos`);
        }
      } else {
        console.log(`      ✗ El item no tiene productId`);
      }
    }
    
    // Verificar logs de inventario para estos productos
    console.log('\n3. Verificando logs de inventario para los productos de esta venta:');
    
    for (const item of sale.items) {
      if (item.productId) {
        const { data: logs, error: logsError } = await supabase
          .from('inventory_logs')
          .select('*')
          .eq('product_id', item.productId)
          .order('created_at', { ascending: false })
          .limit(3);
        
        if (logsError) {
          console.log(`   ✗ Error al buscar logs para ${item.productId}: ${logsError.message}`);
        } else if (logs && logs.length > 0) {
          console.log(`   Logs para ${item.productId} (${item.name}):`);
          for (const log of logs) {
            console.log(`      - ${log.created_at}: ${log.reason} - "${log.product_name}"`);
          }
        } else {
          console.log(`   No se encontraron logs para ${item.productId}`);
        }
      }
    }
    
    console.log('\n=== Análisis Completado ===');
    
  } catch (error) {
    console.error('Error durante el análisis:', error);
  }
}

// Ejecutar el análisis
analyzeSpecificSale();