import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeProduct() {
  console.log('🔍 ANÁLISIS PROFUNDO: Cable 1Hora iphone 2.1A 1M');
  console.log('=' .repeat(60));

  try {
    // 1. Buscar el producto en la base de datos
    console.log('\n📦 1. BÚSQUEDA DEL PRODUCTO');
    console.log('-'.repeat(40));
    
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .ilike('name', '%Cable 1Hora iphone 2.1A 1M%');

    if (productError) {
      console.error('❌ Error buscando producto:', productError);
      return;
    }

    if (!products || products.length === 0) {
      console.log('⚠️  Producto no encontrado con ese nombre exacto');
      
      // Búsqueda más amplia
      const { data: similarProducts, error: similarError } = await supabase
        .from('products')
        .select('*')
        .or('name.ilike.%cable%,name.ilike.%iphone%,name.ilike.%1hora%');

      if (similarError) {
        console.error('❌ Error en búsqueda amplia:', similarError);
        return;
      }

      console.log(`\n🔍 Productos similares encontrados: ${similarProducts?.length || 0}`);
      similarProducts?.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} - Stock: ${product.stock} - ID: ${product.firestore_id}`);
      });
      return;
    }

    const product = products[0];
    console.log('✅ Producto encontrado:');
    console.log(`   Nombre: ${product.name}`);
    console.log(`   ID: ${product.firestore_id}`);
    console.log(`   Stock actual: ${product.stock}`);
    console.log(`   Precio: $${product.price}`);
    console.log(`   Costo: $${product.cost}`);
    console.log(`   Tipo: ${product.type}`);
    console.log(`   Propiedad: ${product.ownership_type}`);
    console.log(`   Creado: ${new Date(product.created_at).toLocaleString()}`);
    console.log(`   Actualizado: ${new Date(product.updated_at).toLocaleString()}`);

    // 2. Verificar historial de ventas
    console.log('\n💰 2. HISTORIAL DE VENTAS');
    console.log('-'.repeat(40));
    
    // Buscar ventas que contengan este producto en el array de items
    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('createdAt', { ascending: false });

    if (salesError) {
      console.error('❌ Error consultando ventas:', salesError);
    } else {
      // Filtrar ventas que contengan el producto
      const salesWithProduct = allSales?.filter(sale => {
        if (!sale.items || !Array.isArray(sale.items)) return false;
        return sale.items.some(item => item.id === product.firestore_id);
      }) || [];
      
      console.log(`📊 Total de ventas encontradas: ${salesWithProduct.length}`);
      
      let totalQuantitySold = 0;
      let totalRevenue = 0;
      
      salesWithProduct.forEach((sale, index) => {
        const item = sale.items.find(item => item.id === product.firestore_id);
        if (item) {
          totalQuantitySold += item.quantity;
          totalRevenue += item.price * item.quantity;
          console.log(`   ${index + 1}. Venta ${sale.saleId} - Cantidad: ${item.quantity} - Fecha: ${new Date(sale.createdAt).toLocaleDateString()}`);
        }
      });
      
      console.log(`\n📈 RESUMEN DE VENTAS:`);
      console.log(`   Total vendido: ${totalQuantitySold} unidades`);
      console.log(`   Ingresos totales: $${totalRevenue.toFixed(2)}`);
      console.log(`   Precio promedio: $${totalQuantitySold > 0 ? (totalRevenue / totalQuantitySold).toFixed(2) : 0}`);
    }

    // 3. Revisar logs de inventario
    console.log('\n📋 3. LOGS DE INVENTARIO');
    console.log('-'.repeat(40));
    
    // Buscar por productId (string) en lugar de product_id (UUID)
    const { data: inventoryLogs, error: logsError } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('productId', product.firestore_id)
      .order('createdAt', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('❌ Error consultando logs de inventario:', logsError);
      
      // Intentar con diferentes campos
      const { data: inventoryLogs2, error: logsError2 } = await supabase
        .from('inventory_logs')
        .select('*')
        .ilike('productName', `%${product.name}%`)
        .order('createdAt', { ascending: false })
        .limit(10);
        
      if (logsError2) {
        console.error('❌ Error en segunda consulta de logs:', logsError2);
      } else {
        console.log(`📝 Últimos ${inventoryLogs2?.length || 0} movimientos de inventario (por nombre):`);
        
        inventoryLogs2?.forEach((log, index) => {
          const changeType = log.change > 0 ? '📈 ENTRADA' : '📉 SALIDA';
          console.log(`   ${index + 1}. ${changeType} - Cambio: ${log.change} - Razón: ${log.reason} - Fecha: ${new Date(log.createdAt).toLocaleDateString()}`);
          if (log.metadata) {
            console.log(`      Metadata: ${JSON.stringify(log.metadata)}`);
          }
        });
      }
    } else {
      console.log(`📝 Últimos ${inventoryLogs?.length || 0} movimientos de inventario:`);
      
      inventoryLogs?.forEach((log, index) => {
        const changeType = log.change > 0 ? '📈 ENTRADA' : '📉 SALIDA';
        console.log(`   ${index + 1}. ${changeType} - Cambio: ${log.change} - Razón: ${log.reason} - Fecha: ${new Date(log.createdAt).toLocaleDateString()}`);
        if (log.metadata) {
          console.log(`      Metadata: ${JSON.stringify(log.metadata)}`);
        }
      });
    }

    // 4. Análisis de stock
    console.log('\n📊 4. ANÁLISIS DE STOCK');
    console.log('-'.repeat(40));
    
    const currentStock = parseInt(product.stock) || 0;
    const reorderPoint = parseInt(product.reorder_point) || 0;
    
    console.log(`   Stock actual: ${currentStock} unidades`);
    console.log(`   Punto de reorden: ${reorderPoint} unidades`);
    
    if (currentStock <= reorderPoint) {
      console.log('⚠️  ALERTA: Stock por debajo del punto de reorden');
    } else {
      console.log('✅ Stock en niveles normales');
    }
    
    if (currentStock === 154) {
      console.log('✅ Stock coincide con el reportado (154 unidades)');
    } else {
      console.log(`⚠️  Discrepancia: Stock reportado 154, stock en BD: ${currentStock}`);
    }

    // 5. Verificar integridad de datos
    console.log('\n🔍 5. VERIFICACIÓN DE INTEGRIDAD');
    console.log('-'.repeat(40));
    
    // Verificar si hay productos duplicados
    const { data: duplicates, error: dupError } = await supabase
      .from('products')
      .select('*')
      .eq('name', product.name);

    if (dupError) {
      console.error('❌ Error verificando duplicados:', dupError);
    } else {
      if (duplicates && duplicates.length > 1) {
        console.log(`⚠️  ADVERTENCIA: ${duplicates.length} productos con el mismo nombre encontrados`);
        duplicates.forEach((dup, index) => {
          console.log(`   ${index + 1}. ID: ${dup.firestore_id} - Stock: ${dup.stock}`);
        });
      } else {
        console.log('✅ No se encontraron productos duplicados');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ANÁLISIS COMPLETADO');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  }
}

// Ejecutar el análisis
analyzeProduct();