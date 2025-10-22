const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInventoryDeduction() {
  console.log("🔍 Verificando deducción de inventario...\n");

  try {
    // 1. Verificar ventas recientes
    console.log("1. Buscando ventas recientes...");
    const { data: recentSales, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(5);

    if (salesError) {
      console.error("❌ Error al obtener ventas:", salesError);
      return;
    }

    console.log(`✅ Encontradas ${recentSales.length} ventas recientes`);

    if (recentSales.length === 0) {
      console.log("⚠️ No hay ventas recientes para analizar");
      return;
    }

    // 2. Para cada venta, verificar los logs de inventario
    for (const sale of recentSales) {
      console.log(`\n📋 Analizando venta ${sale.saleId} (${new Date(sale.createdAt).toLocaleString()})`);
      
      // Verificar si hay logs de inventario para esta venta
      const { data: inventoryLogs, error: logsError } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("metadata->>saleId", sale.saleId)
        .eq("reason", "Venta");

      if (logsError) {
        console.error(`❌ Error al buscar logs para venta ${sale.saleId}:`, logsError);
        continue;
      }

      console.log(`📊 Logs de inventario encontrados: ${inventoryLogs.length}`);

      // Mostrar detalles de los items de la venta
      console.log("📦 Items de la venta:");
      sale.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} - Cantidad: ${item.quantity}`);
      });

      // Mostrar detalles de los logs de inventario
      if (inventoryLogs.length > 0) {
        console.log("📉 Logs de inventario:");
        inventoryLogs.forEach((log, index) => {
          console.log(`  ${index + 1}. Producto: ${log.productName} - Cambio: ${log.change} - Razón: ${log.reason}`);
        });
      } else {
        console.log("⚠️ No se encontraron logs de inventario para esta venta");
      }

      // Verificar estado actual de los productos
      console.log("🔍 Estado actual de los productos:");
      for (const item of sale.items) {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, name, stock, firestore_id")
          .or(`id.eq.${item.productId},firestore_id.eq.${item.productId}`)
          .maybeSingle();

        if (productError) {
          console.error(`❌ Error al obtener producto ${item.productId}:`, productError);
          continue;
        }

        if (product) {
          console.log(`  📎 ${product.name} - Stock actual: ${product.stock}`);
        } else {
          console.log(`  ❌ Producto ${item.productId} no encontrado`);
        }
      }
    }

    // 3. Verificar si hay productos con stock negativo
    console.log("\n🔍 Buscando productos con stock negativo...");
    const { data: negativeStock, error: negativeError } = await supabase
      .from("products")
      .select("id, name, stock, sku")
      .lt("stock", 0);

    if (negativeError) {
      console.error("❌ Error al buscar stock negativo:", negativeError);
    } else {
      if (negativeStock.length > 0) {
        console.log(`⚠️ Encontrados ${negativeStock.length} productos con stock negativo:`);
        negativeStock.forEach(product => {
          console.log(`  - ${product.name} (${product.sku}): ${product.stock}`);
        });
      } else {
        console.log("✅ No hay productos con stock negativo");
      }
    }

    // 4. Resumen
    console.log("\n📊 RESUMEN:");
    console.log(`- Ventas recientes analizadas: ${recentSales.length}`);
    
    let totalLogMatches = 0;
    for (const sale of recentSales) {
      const { data: inventoryLogs } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("metadata->>saleId", sale.saleId)
        .eq("reason", "Venta");
      
      totalLogMatches += inventoryLogs.length;
    }
    
    console.log(`- Logs de inventario correspondientes: ${totalLogMatches}`);
    
    if (totalLogMatches === 0 && recentSales.length > 0) {
      console.log("🚨 PROBLEMA DETECTADO: Las ventas no están generando logs de inventario");
    } else if (totalLogMatches < recentSales.reduce((sum, sale) => sum + sale.items.length, 0)) {
      console.log("⚠️ PROBLEMA PARCIAL: Algunos items de ventas no están generando logs de inventario");
    } else {
      console.log("✅ Los logs de inventario parecen estar generándose correctamente");
    }

  } catch (error) {
    console.error("❌ Error general:", error);
  }
}

// Ejecutar la verificación
checkInventoryDeduction();