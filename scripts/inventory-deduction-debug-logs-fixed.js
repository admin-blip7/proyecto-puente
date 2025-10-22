const { createClient } = require("@supabase/supabase-js");
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function safeDate(dateString) {
  if (!dateString) return new Date();
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
}

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

    console.log(`📊 Grupos encontrados: ${Object.keys(logsBySaleId).length}`);

    // 3. Analizar cada grupo
    Object.entries(logsBySaleId).forEach(([saleId, logs]) => {
      console.log(`\n📋 Sale ID: ${saleId}`);
      console.log(`📊 Total de logs: ${logs.length}`);
      
      if (logs.length > 1) {
        // Analizar timestamps
        const timestamps = logs.map(log => safeDate(log.createdAt));
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

    // 4. Buscar patrón de 88 logs específicamente
    console.log("\n3. Buscando patrón de 88 logs...");
    const eightyEightLogsPattern = Object.entries(logsBySaleId).filter(([saleId, logs]) => logs.length === 88);
    
    if (eightyEightLogsPattern.length > 0) {
      console.log(`🚨 ENCONTRADAS ${eightyEightLogsPattern.length} ventas con exactamente 88 logs:`);
      
      eightyEightLogsPattern.forEach(([saleId, logs]) => {
        const timestamps = logs.map(log => safeDate(log.createdAt));
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
          console.log("    🔍 ESTO INDICA UN PROBLEMA DE BUCLE O EJECUCIÓN MÚLTIPLE");
        }
      });
    }

    // 5. Verificar timestamps de las ventas
    console.log("\n4. Analizando timestamps de ventas vs logs...");
    const saleIds = Object.keys(logsBySaleId).slice(0, 3); // Limitar a 3 para análisis
    
    for (const saleId of saleIds) {
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select("*")
        .eq("saleId", saleId)
        .maybeSingle();

      if (!saleError && sale) {
        const logs = logsBySaleId[saleId];
        const saleTimestamp = safeDate(sale.createdAt);
        const firstLogTimestamp = safeDate(logs[0].createdAt);
        const timeDiff = firstLogTimestamp - saleTimestamp;
        
        console.log(`\n📋 Venta ${saleId}:`);
        console.log(`📅 Fecha venta: ${saleTimestamp.toISOString()}`);
        console.log(`📅 Primer log: ${firstLogTimestamp.toISOString()}`);
        console.log(`⏰ Diferencia: ${timeDiff}ms`);
        
        if (Math.abs(timeDiff) < 1000) {
          console.log("✅ Timing normal");
        } else {
          console.log("⚠️ Timing anómalo");
        }
      }
    }

    // 6. Análisis final
    console.log("\n📊 ANÁLISIS FINAL:");
    const totalGroups = Object.keys(logsBySaleId).length;
    const problematicGroups = Object.entries(logsBySaleId).filter(([saleId, logs]) => logs.length > 5).length;
    
    console.log(`- Total de grupos de logs: ${totalGroups}`);
    console.log(`- Grupos problemáticos (>5 logs): ${problematicGroups}`);
    
    if (problematicGroups > 0) {
      console.log("🚨 CONCLUSIÓN: HAY UN PROBLEMA CRÍTICO DE DEDUCCIÓN MÚLTIPLE");
      console.log("🔍 CAUSA PROBABLE: EJECUCIÓN MÚLTIPLE DE LA TRANSACCIÓN COMPLETA");
    } else {
      console.log("✅ No se detectaron patrones anómalos");
    }

  } catch (error) {
    console.error("❌ Error general:", error);
  }
}

// Ejecutar el análisis
analyzeInventoryDeductionPattern();