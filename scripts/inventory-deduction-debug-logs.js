const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeInventoryDeductionPattern() {
  console.log("🔍 Analizando patrón de deducción de inventario...\n");

  try {
    // 1. Obtener logs recientes con timestamps detallados
    console.log("1. Obteniendo logs de inventario recientes con timestamps...");
    const { data: recentLogs, error: logsError } = await supabase
      .from("inventory_logs")
      .select("*")
      .eq("reason", "Venta")
      .order("createdAt", { ascending: false })
      .limit(200);

    if (logsError) {
      console.error("❌ Error al obtener logs:", logsError);
      return;
    }

    console.log(`✅ Encontrados ${recentLogs.length} logs recientes`);

    // 2. Agrupar logs por saleId para analizar patrones
    console.log("\n2. Analizando patrones por saleId...");
    const logsBySaleId = {};
    
    recentLogs.forEach(log => {
      const saleId = log.metadata?.saleId;
      if (saleId) {
        if (!logsBySaleId[saleId]) {
          logsBySaleId[saleId] = [];
        }
        logsBySaleId[saleId].push(log);
      }
    });

    // 3. Analizar cada grupo
    Object.entries(logsBySaleId).forEach(([saleId, logs]) => {
      console.log(`\n📋 Sale ID: ${saleId}`);
      console.log(`📊 Total de logs: ${logs.length}`);
      
      if (logs.length > 1) {
        // Analizar timestamps
        const timestamps = logs.map(log => new Date(log.createdAt));
        const firstLog = timestamps[0];
        const lastLog = timestamps[timestamps.length - 1];
        const duration = lastLog - firstLog;
        
        console.log(`⏰ Primer log: ${firstLog.toISOString()}`);
        console.log(`⏰ Último log: ${lastLog.toISOString()}`);
        console.log(`⏱️ Duración total: ${duration}ms`);
        
        // Analizar productos
        const products = {};
        logs.forEach(log => {
          if (!products[log.productId]) {
            products[log.productId] = {
              name: log.productName,
              count: 0,
              totalChange: 0
            };
          }
          products[log.productId].count++;
          products[log.productId].totalChange += log.change;
        });
        
        console.log("📦 Productos afectados:");
        Object.entries(products).forEach(([productId, info]) => {
          console.log(`  - ${info.name}: ${info.count} logs, cambio total: ${info.totalChange}`);
        });
        
        // Detectar patrón de tiempo
        if (duration < 1000) {
          console.log("🚨 PATRÓN DETECTADO: Múltiples logs en menos de 1 segundo");
        } else if (duration < 5000) {
          console.log("⚠️ PATRÓN SOSPECHOSO: Múltiples logs en menos de 5 segundos");
        }
      }
    });

    // 4. Buscar ventas correspondientes
    console.log("\n3. Buscando ventas correspondientes...");
    const saleIds = Object.keys(logsBySaleId);
    
    for (const saleId of saleIds.slice(0, 5)) { // Limitar a 5 para no sobrecargar
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("*")
        .eq("saleId", saleId)
        .maybeSingle();

      if (!saleError && sale) {
        console.log(`\n📋 Venta ${saleId}:`);
        console.log(`📅 Fecha: ${new Date(sale.createdAt).toISOString()}`);
        console.log(`📦 Items: ${sale.items.length}`);
        
        // Comparar timestamps
        const saleTimestamp = new Date(sale.createdAt);
        const logs = logsBySaleId[saleId];
        const firstLogTimestamp = new Date(logs[0].createdAt);
        const timeDiff = firstLogTimestamp - saleTimestamp;
        
        console.log(`⏰ Diferencia venta-primer log: ${timeDiff}ms`);
        
        if (Math.abs(timeDiff) < 1000) {
          console.log("✅ Timing normal entre venta y logs");
        } else {
          console.log("⚠️ Timing anómalo entre venta y logs");
        }
      }
    }

    // 5. Buscar patrón de 88 logs específicamente
    console.log("\n4. Buscando patrón de 88 logs...");
    const eightyEightLogsPattern = Object.entries(logsBySaleId).filter(([saleId, logs]) => logs.length === 88);
    
    if (eightyEightLogsPattern.length > 0) {
      console.log(`🚨 ENCONTRADAS ${eightyEightLogsPattern.length} ventas con exactamente 88 logs:`);
      
      eightyEightLogsPattern.forEach(([saleId, logs]) => {
        const timestamps = logs.map(log => new Date(log.createdAt));
        const firstLog = timestamps[0];
        const lastLog = timestamps[timestamps.length - 1];
        const duration = lastLog - firstLog;
        
        console.log(`  - ${saleId}: duración ${duration}ms`);
        
        // Analizar intervalos entre logs
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i-1]);
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const minInterval = Math.min(...intervals);
        const maxInterval = Math.max(...intervals);
        
        console.log(`    Intervalo promedio: ${avgInterval.toFixed(2)}ms`);
        console.log(`    Intervalo mínimo: ${minInterval}ms`);
        console.log(`    Intervalo máximo: ${maxInterval}ms`);
        
        if (avgInterval < 10) {
          console.log("    🚨 LOS LOGS ESTÁN SIENDO CREADOS CASI SIMULTÁNEAMENTE");
        }
      });
    }

    // 6. Verificar si hay triggers en la base de datos
    console.log("\n5. Verificando estructura de la tabla inventory_logs...");
    const { data: tableInfo, error: tableError } = await supabase
      .from("inventory_logs")
      .select("*")
      .limit(1);

    if (tableError) {
      console.error("❌ Error al verificar tabla:", tableError);
    } else {
      console.log("✅ Estructura de tabla accesible");
    }

  } catch (error) {
    console.error("❌ Error general:", error);
  }
}

// Ejecutar el análisis
analyzeInventoryDeductionPattern();