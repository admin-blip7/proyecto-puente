import { NextResponse } from "next/server";
import { InventoryValidationService } from "@/lib/services/inventoryValidationService";

export async function POST(request: Request) {
  try {
    console.log("🔍 INICIANDO VALIDACIÓN DE INVENTARIO...");
    
    const body = await request.json();
    const { action, autoFix } = body;

    if (action === "validate") {
      console.log("📊 Ejecutando validación completa...");
      
      // Ejecutar validación
      const validationResult = await InventoryValidationService.validateInventory();
      
      console.log(`📊 Resultado: ${validationResult.isValid ? 'VÁLIDO' : 'PROBLEMAS DETECTADOS'}`);
      console.log(`📊 Problemas encontrados: ${validationResult.issues.length}`);
      
      // Si se solicita auto-fix y hay problemas
      let fixResult = null;
      if (autoFix && !validationResult.isValid) {
        console.log("🔧 Ejecutando corrección automática...");
        
        // Filtrar problemas que se pueden corregir automáticamente
        const fixableIssues = validationResult.issues.filter(
          issue => issue.type === 'negative_stock'
        );
        
        if (fixableIssues.length > 0) {
          fixResult = await InventoryValidationService.autoFixIssues(fixableIssues);
          console.log(`📊 Corrección: ${fixResult.fixed} arreglados, ${fixResult.failed} fallidos`);
        }
      }

      // Generar reporte
      const report = InventoryValidationService.generateValidationReport(validationResult);
      
      return NextResponse.json({
        success: true,
        validationResult,
        fixResult,
        report,
        timestamp: new Date().toISOString()
      });

    } else if (action === "quickCheck") {
      console.log("⚡ Ejecutando verificación rápida...");
      
      // Verificación rápida solo de problemas críticos
      const validationResult = await InventoryValidationService.validateInventory();
      
      // Filtrar solo problemas críticos
      const criticalIssues = validationResult.issues.filter(
        issue => issue.severity === 'critical'
      );
      
      return NextResponse.json({
        success: true,
        isHealthy: criticalIssues.length === 0,
        criticalIssues: criticalIssues.length,
        totalIssues: validationResult.issues.length,
        summary: validationResult.summary,
        timestamp: new Date().toISOString()
      });

    } else if (action === "generateReport") {
      console.log("📄 Generando reporte de validación...");
      
      const validationResult = await InventoryValidationService.validateInventory();
      const report = InventoryValidationService.generateValidationReport(validationResult);
      
      return NextResponse.json({
        success: true,
        report,
        validationResult,
        timestamp: new Date().toISOString()
      });

    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      availableActions: ["validate", "quickCheck", "generateReport"],
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Error en validación de inventario:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to validate inventory",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("🔍 Verificando estado de validación de inventario...");
    
    // Verificación rápida del estado
    const validationResult = await InventoryValidationService.validateInventory();
    
    const status = {
      isHealthy: validationResult.isValid,
      totalIssues: validationResult.issues.length,
      criticalIssues: validationResult.issues.filter(i => i.severity === 'critical').length,
      highIssues: validationResult.issues.filter(i => i.severity === 'high').length,
      lastChecked: new Date().toISOString(),
      summary: validationResult.summary
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
      error: "Failed to check inventory status",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}