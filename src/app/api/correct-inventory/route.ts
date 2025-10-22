import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function POST(request: Request) {
  try {
    console.log("🔧 INICIANDO CORRECCIÓN DE INVENTARIO...");
    
    const body = await request.json();
    const { action, dryRun = false } = body;

    if (action === "analyzeDuplicates") {
      console.log("📊 Analizando logs duplicados...");
      
      const supabase = getSupabaseServerClient();
      
      // Obtener todos los logs de venta
      const { data: allLogs, error: logsError } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("reason", "Venta")
        .order("createdAt", { ascending: false });

      if (logsError) {
        console.error("❌ Error obteniendo logs:", logsError);
        throw logsError;
      }

      console.log(`✅ Encontrados ${allLogs.length} logs de venta`);

      // Agrupar por saleId y productId
      const logsBySaleProduct: Record<string, any[]> = {};
      
      allLogs.forEach(log => {
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

      // Identificar grupos con duplicados
      const duplicateGroups = Object.entries(logsBySaleProduct).filter(([key, logs]) => logs.length > 1);
      
      console.log(`🚨 Grupos con duplicados: ${duplicateGroups.length}`);

      // Analizar impacto
      const analysis = {
        totalLogs: allLogs.length,
        totalGroups: Object.keys(logsBySaleProduct).length,
        duplicateGroups: duplicateGroups.length,
        totalOverDeduction: 0,
        correctionsNeeded: [] as any[]
      };

      duplicateGroups.forEach(([key, logs]) => {
        const [saleId, productId] = key.split('-');
        const product = logs[0];
        const totalDeduction = logs.reduce((sum, log) => sum + log.change, 0);
        const expectedDeduction = logs[0].change;
        const overDeduction = Math.abs(totalDeduction - expectedDeduction);
        
        analysis.totalOverDeduction += overDeduction;
        
        analysis.correctionsNeeded.push({
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

      console.log(`💾 Total sobre-deducción: ${analysis.totalOverDeduction} unidades`);

      return NextResponse.json({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      });

    } else if (action === "executeCorrection") {
      console.log("🔧 Ejecutando corrección de inventario...");
      
      if (dryRun) {
        console.log("🧪 MODO PRUEBA - No se realizarán cambios reales");
      }

      const supabase = getSupabaseServerClient();
      
      // Primero analizar duplicados
      const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/correct-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyzeDuplicates' })
      });
      
      const analysisData = await analysisResponse.json();
      
      if (!analysisData.success) {
        throw new Error("Failed to analyze duplicates");
      }

      const { correctionsNeeded } = analysisData.analysis;
      console.log(`📊 Correcciones necesarias: ${correctionsNeeded.length}`);

      if (correctionsNeeded.length === 0) {
        return NextResponse.json({
          success: true,
          message: "No corrections needed",
          correctedGroups: 0,
          totalUnitsRestored: 0,
          timestamp: new Date().toISOString()
        });
      }

      let correctedGroups = 0;
      let totalUnitsRestored = 0;
      const correctionDetails = [];

      for (const correction of correctionsNeeded) {
        console.log(`🔧 Procesando: ${correction.productName} (Venta: ${correction.saleId})`);
        
        try {
          if (!dryRun) {
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
          } else {
            // Modo prueba - solo simular
            totalUnitsRestored += correction.overDeduction;
            console.log(`🧪 [PRUEBA] Stock sería corregido: +${correction.overDeduction} unidades`);
          }

          correctedGroups++;
          correctionDetails.push({
            productName: correction.productName,
            saleId: correction.saleId,
            overDeduction: correction.overDeduction,
            status: dryRun ? 'simulated' : 'corrected'
          });
          
        } catch (error) {
          console.error(`❌ Error en corrección de ${correction.productName}:`, error);
          correctionDetails.push({
            productName: correction.productName,
            saleId: correction.saleId,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: 'failed'
          });
        }
      }

      const result = {
        success: true,
        message: dryRun ? "Correction simulation completed" : "Correction completed",
        correctedGroups,
        totalUnitsRestored,
        correctionDetails,
        dryRun,
        timestamp: new Date().toISOString()
      };

      console.log(`🎉 CORRECCIÓN ${dryRun ? 'SIMULADA' : 'COMPLETADA'}: ${correctedGroups} grupos, ${totalUnitsRestored} unidades`);

      return NextResponse.json(result);

    } else if (action === "validateCorrection") {
      console.log("🔍 Validando corrección aplicada...");
      
      const supabase = getSupabaseServerClient();
      
      // Verificar logs duplicados restantes
      const { data: finalLogs, error: finalError } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("reason", "Venta")
        .order("createdAt", { ascending: false })
        .limit(200);

      if (finalError) {
        throw finalError;
      }

      const finalGroups: Record<string, any[]> = {};
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
      
      // Verificar stock negativo
      const { data: negativeStock, error: negativeError } = await supabase
        .from("products")
        .select("id, name, stock, sku")
        .lt("stock", 0)
        .limit(10);

      const validation = {
        remainingDuplicates,
        negativeStockProducts: negativeStock?.length || 0,
        totalRecentLogs: finalLogs.length,
        validationPassed: remainingDuplicates === 0 && (negativeStock?.length || 0) === 0,
        issues: [] as any[]
      };

      if (remainingDuplicates > 0) {
        validation.issues.push({
          type: 'duplicate_logs',
          count: remainingDuplicates,
          severity: 'high'
        });
      }

      if (negativeStock && negativeStock.length > 0) {
        validation.issues.push({
          type: 'negative_stock',
          count: negativeStock.length,
          severity: 'critical',
          products: negativeStock.map(p => ({ name: p.name, stock: p.stock }))
        });
      }

      return NextResponse.json({
        success: true,
        validation,
        timestamp: new Date().toISOString()
      });

    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      availableActions: ["analyzeDuplicates", "executeCorrection", "validateCorrection"],
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Error en corrección de inventario:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to correct inventory",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("🔍 Verificando estado de corrección de inventario...");
    
    const supabase = getSupabaseServerClient();
    
    // Verificar estado actual
    const { data: recentLogs, error: logsError } = await supabase
      .from("inventory_logs")
      .select("*")
      .eq("reason", "Venta")
      .order("createdAt", { ascending: false })
      .limit(100);

    if (logsError) {
      throw logsError;
    }

    // Contar duplicados recientes
    const logsBySaleProduct: Record<string, any[]> = {};
    recentLogs.forEach(log => {
      const saleId = log.metadata?.saleId;
      const productId = log.productId;
      if (saleId && productId) {
        const key = `${saleId}-${productId}`;
        if (!logsBySaleProduct[key]) logsBySaleProduct[key] = [];
        logsBySaleProduct[key].push(log);
      }
    });

    const duplicateCount = Object.values(logsBySaleProduct).filter(logs => logs.length > 1).length;
    
    // Verificar stock negativo
    const { data: negativeStock, error: negativeError } = await supabase
      .from("products")
      .select("id, name, stock")
      .lt("stock", 0);

    const status = {
      healthy: duplicateCount === 0 && (negativeStock?.length || 0) === 0,
      duplicateLogs: duplicateCount,
      negativeStockProducts: negativeStock?.length || 0,
      recentLogsAnalyzed: recentLogs.length,
      lastChecked: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Error verificando estado:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to check correction status",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}