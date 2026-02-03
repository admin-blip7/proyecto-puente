const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function correctInventoryData() {
  console.log("🔧 INICIANDO CORRECCIÓN DE DATOS DE INVENTARIO...\n");

  try {
    // 1. Analizar logs duplicados
    console.log("1. Analizando logs duplicados...");
    const { data: duplicateLogs, error: logsError } = await supabase
      .from("inventory_logs")
      .select("*")
      .eq("reason", "Venta")
      .order("createdAt", { ascending: false });

    if (logsError) {
      console.error("❌ Error obteniendo logs:", logsError);
      return;
    }

    console.log(`✅ Encontrados ${duplicateLogs.length} logs de venta`);

    // 2. Agrupar logs por saleId y producto
    console.log("\n2. Agrupando logs por venta y producto...");
    const logsBySaleProduct = {};
    
    duplicateLogs.forEach(log => {
      const saleId = log.metadata?.saleId;
      const productId = log.productId;
      
      if (saleId && productId) {
        const key = `${saleId}-${productId}`;
        if (!logsBySaleProduct[key]) {
          logsBySaleProduct[key] = [];
        }
        logsBySaleProduct[key].push(log);
      }
    });

    console.log(`📊 Grupos encontrados: ${Object.keys(logsBySaleProduct).length}`);

    // 3. Identificar grupos con duplicados
    console.log("\n3. Identificando grupos con duplicados...");
    const duplicateGroups = Object.entries(logsBySaleProduct).filter(([key, logs]) => logs.length > 1);
    
    console.log(`🚨 Grupos con duplicados: ${duplicateGroups.length}`);

    if (duplicateGroups.length === 0) {
      console.log("✅ No se encontraron duplicados para corregir");
      return;
    }

    // 4. Analizar impacto de duplicados
    console.log("\n4. Analizando impacto de duplicados...");
    let totalOverDeduction = 0;
    const correctionsNeeded = [];

    duplicateGroups.forEach(([key, logs]) => {
      const [saleId, productId] = key.split('-');
      const product = logs[0];
      const totalDeduction = logs.reduce((sum, log) => sum + log.change, 0);
      const expectedDeduction = logs[0].change; // Debería ser solo un log
      const overDeduction = Math.abs(totalDeduction - expectedDeduction);
      
      totalOverDeduction += overDeduction;
      
      correctionsNeeded.push({
        saleId,
        productId,
        productName: product.productName,
        totalLogs: logs.length,
        totalDeduction,
        expectedDeduction,
        overDeduction,
        logs: logs.map(log => ({
          id: log.id,
          createdAt: log.createdAt,
          change: log.change
        }))
      });
    });

    console.log(`💾 Total sobre-deducción: ${totalOverDeduction} unidades`);

    // 5. Mostrar resumen de correcciones necesarias
    console.log("\n5. Resumen de correcciones necesarias:");
    correctionsNeeded.forEach((correction, index) => {
      console.log(`${index + 1}. ${correction.productName}`);
      console.log(`   Venta: ${correction.saleId}`);
      console.log(`   Logs: ${correction.totalLogs} (debería ser 1)`);
      console.log(`   Sobre-deducción: ${correction.overDeduction} unidades`);
      console.log("");
    });

    // 6. Ejecutar correcciones
    console.log("6. Ejecutando correcciones...");
    let correctedGroups = 0;
    let totalUnitsRestored = 0;

    for (const correction of correctionsNeeded) {
      console.log(`🔧 Corrigiendo: ${correction.productName} (Venta: ${correction.saleId})`);
      
      try {
        // Mantener solo el primer log, eliminar los demás
        const logsToKeep = [correction.logs[0]];
        const logsToDelete = correction.logs.slice(1);
        
        // Eliminar logs duplicados
        for (const logToDelete of logsToDelete) {
          const { error: deleteError } = await supabase
            .from("inventory_logs")
            .delete()
            .eq("id", logToDelete.id);

          if (deleteError) {
            console.error(`❌ Error eliminando log ${logToDelete.id}:`, deleteError);
            continue;
          }
        }

        // Corregir stock del producto
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, stock")
          .or(`id.eq.${correction.productId},firestore_id.eq.${correction.productId}`)
          .maybeSingle();

        if (!productError && product) {
          const newStock = product.stock + correction.overDeduction;
          
          const { error: updateError } = await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", product.id);

          if (updateError) {
            console.error(`❌ Error actualizando stock:`, updateError);
          } else {
            console.log(`✅ Stock corregido: ${product.stock} → ${newStock} (+${correction.overDeduction})`);
            totalUnitsRestored += correction.overDeduction;
          }
        }

        correctedGroups++;
        console.log(`✅ Corrección completada para ${correction.productName}`);
        
      } catch (error) {
        console.error(`❌ Error en corrección de ${correction.productName}:`, error);
      }
      
      console.log("");
    }

    // 7. Verificación final
    console.log("7. Verificación final...");
    const { data: finalLogs, error: finalError } = await supabase
      .from("inventory_logs")
      .select("*")
      .eq("reason", "Venta")
      .order("createdAt", { ascending: false })
      .limit(100);

    if (!finalError) {
      const finalGroups = {};
      finalLogs.forEach(log => {
        const saleId = log.metadata?.saleId;
        const productId = log.productId;
        if (saleId && productId) {
          const key = `${saleId}-${productId}`;
          if (!finalGroups[key]) finalGroups[key] = [];
          finalGroups[key].push(log);
        }
      });

      const remainingDuplicates = Object.values(finalGroups).filter(logs => logs.length > 1).length;
      console.log(`📊 Logs duplicados restantes: ${remainingDuplicates}`);
    }

    // 8. Resumen final
    console.log("\n📊 RESUMEN DE CORRECCIÓN:");
    console.log(`✅ Grupos corregidos: ${correctedGroups}/${correctionsNeeded.length}`);
    console.log(`📦 Unidades restauradas al inventario: ${totalUnitsRestored}`);
    console.log(`💰 Impacto financiero mitigado: ${totalUnitsRestored} unidades`);
    
    if (correctedGroups === correctionsNeeded.length) {
      console.log("🎉 TODAS LAS CORRECCIONES COMPLETADAS EXITOSAMENTE");
    } else {
      console.log("⚠️ Algunas correcciones fallaron - revisar logs above");
    }

  } catch (error) {
    console.error("❌ Error general en corrección:", error);
  }
}

// Función para crear backup antes de corregir
async function createBackup() {
  console.log("💾 CREANDO BACKUP DE DATOS...");
  
  try {
    const { data: logs, error } = await supabase
      .from("inventory_logs")
      .select("*")
      .eq("reason", "Venta");

    if (error) {
      console.error("❌ Error creando backup:", error);
      return;
    }

    const backupData = {
      timestamp: new Date().toISOString(),
      totalLogs: logs.length,
      logs: logs
    };

    // Guardar backup en archivo local
    const fs = require('fs');
    const backupFileName = `inventory-logs-backup-${Date.now()}.json`;
    
    fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup guardado en: ${backupFileName}`);
    
    return backupFileName;
  } catch (error) {
    console.error("❌ Error creando backup:", error);
  }
}

// Ejecutar corrección con backup
async function main() {
  console.log("🚀 INICIANDO PROCESO DE CORRECCIÓN DE INVENTARIO\n");
  
  // Crear backup
  const backupFile = await createBackup();
  
  if (backupFile) {
    console.log("✅ Backup creado - procediendo con corrección\n");
    await correctInventoryData();
  } else {
    console.log("❌ No se pudo crear backup - abortando corrección");
  }
}

// Ejecutar
main();