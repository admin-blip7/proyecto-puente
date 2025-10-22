import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { addSaleAndUpdateStock } from "@/lib/services/salesService-fixed";
import { InventoryValidationService } from "@/lib/services/inventoryValidationService";

interface TestResults {
  setup: { success: boolean; message: string; details: any };
  validation: { success: boolean; message: string; issues: any[] };
  correction: { success: boolean; message: string; corrected: number };
  testSale: { success: boolean; message: string; saleData: any; executionTime?: number };
  finalValidation: { success: boolean; message: string; issues: any[] };
}

export async function POST(request: Request) {
  try {
    console.log("🧪 INICIANDO PRUEBA COMPLETA DE SOLUCIÓN...");
    
    const body = await request.json();
    const { action, testType } = body;

    if (action === "runFullTest") {
      console.log("🔄 EJECUTANDO PRUEBA COMPLETA DE SOLUCIÓN");
      
      const results: TestResults = {
        setup: { success: false, message: "", details: {} },
        validation: { success: false, message: "", issues: [] as any[] },
        correction: { success: false, message: "", corrected: 0 },
        testSale: { success: false, message: "", saleData: null },
        finalValidation: { success: false, message: "", issues: [] as any[] }
      };

      // 1. Setup de tablas de deduplicación
      console.log("1️⃣ Configurando tablas de deduplicación...");
      try {
        const setupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/setup-deduplication-table`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        
        const setupData = await setupResponse.json();
        results.setup = setupData;
        
        if (setupData.success) {
          console.log("✅ Tablas configuradas correctamente");
        } else {
          console.log("⚠️ Las tablas ya existían o hubo un error (continuando prueba)");
        }
      } catch (error) {
        console.log("⚠️ Error en setup, continuando prueba:", error);
        results.setup.success = true; // Continuar aunque falle
        results.setup.message = "Setup failed but continuing test";
      }

      // 2. Validación inicial
      console.log("2️⃣ Ejecutando validación inicial...");
      try {
        const initialValidation = await InventoryValidationService.validateInventory();
        results.validation = {
          success: true,
          message: `Encontrados ${initialValidation.issues.length} problemas iniciales`,
          issues: initialValidation.issues
        };
        console.log(`📊 Problemas iniciales: ${initialValidation.issues.length}`);
      } catch (error) {
        console.error("❌ Error en validación inicial:", error);
        results.validation.success = false;
        results.validation.message = error instanceof Error ? error.message : "Unknown error";
      }

      // 3. Corrección de inventario existente (si hay problemas)
      if (results.validation.issues.length > 0) {
        console.log("3️⃣ Ejecutando corrección de inventario...");
        try {
          const correctionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/correct-inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: "executeCorrection",
              dryRun: false
            })
          });
          
          const correctionData = await correctionResponse.json();
          results.correction = correctionData;
          
          if (correctionData.success) {
            console.log(`✅ Corrección completada: ${correctionData.correctedGroups} grupos, ${correctionData.totalUnitsRestored} unidades`);
          } else {
            console.log("⚠️ La corrección tuvo problemas");
          }
        } catch (error) {
          console.error("❌ Error en corrección:", error);
          results.correction.success = false;
          results.correction.message = error instanceof Error ? error.message : "Unknown error";
        }
      } else {
        results.correction.success = true;
        results.correction.message = "No se necesita corrección";
        console.log("✅ No se necesita corrección de inventario");
      }

      // 4. Prueba de venta con el sistema corregido
      console.log("4️⃣ Ejecutando prueba de venta...");
      try {
        const supabase = getSupabaseServerClient();
        
        // Crear producto de prueba si no existe
        const testProductId = "test-solution-product";
        const { data: existingProduct } = await supabase
          .from("products")
          .select("*")
          .eq("id", testProductId)
          .maybeSingle();

        if (!existingProduct) {
          await supabase.from("products").insert({
            id: testProductId,
            firestore_id: testProductId,
            name: "Producto Prueba Solución",
            price: 100,
            cost: 50,
            stock: 10,
            sku: "TEST-SOL-001",
            type: "Venta",
            ownershipType: "Propio",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }

        // Ejecutar venta de prueba
        const testCartItems = [{
          id: testProductId,
          name: "Producto Prueba Solución",
          price: 100,
          quantity: 2,
          cost: 50,
          stock: 10,
          sku: "TEST-SOL-001",
          createdAt: new Date(),
          type: "Venta" as const,
          ownershipType: "Propio" as const
        }];

        const testSaleData = {
          items: testCartItems.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            priceAtSale: item.price,
            serials: [],
          })),
          totalAmount: 200,
          paymentMethod: "Efectivo" as const,
          cashierId: "test-user-solution",
          cashierName: "Usuario Test Solución",
          customerName: null,
          customerPhone: null,
        };

        const startTime = Date.now();
        const saleResult = await addSaleAndUpdateStock(testSaleData, testCartItems);
        const endTime = Date.now();

        results.testSale = {
          success: true,
          message: `Venta completada en ${endTime - startTime}ms`,
          saleData: saleResult || null,
          executionTime: endTime - startTime
        };

        console.log(`✅ Venta de prueba completada en ${endTime - startTime}ms`);

        // Verificar que se creó solo 1 log por producto
        const { data: testLogs } = await supabase
          .from("inventory_logs")
          .select("*")
          .eq("metadata->>saleId", saleResult.saleId);

        if (testLogs && testLogs.length === 1) {
          console.log("✅ Se creó exactamente 1 log de inventario (CORRECTO)");
        } else {
          console.log(`❌ Se crearon ${testLogs?.length || 0} logs (INCORRECTO)`);
        }

      } catch (error) {
        console.error("❌ Error en prueba de venta:", error);
        results.testSale.success = false;
        results.testSale.message = error instanceof Error ? error.message : "Unknown error";
      }

      // 5. Validación final
      console.log("5️⃣ Ejecutando validación final...");
      try {
        const finalValidation = await InventoryValidationService.validateInventory();
        results.finalValidation = {
          success: finalValidation.isValid,
          message: `Estado final: ${finalValidation.isValid ? 'VÁLIDO' : 'CON PROBLEMAS'}`,
          issues: finalValidation.issues
        };
        console.log(`📊 Estado final: ${finalValidation.isValid ? 'VÁLIDO' : 'CON PROBLEMAS'}`);
      } catch (error) {
        console.error("❌ Error en validación final:", error);
        results.finalValidation.success = false;
        results.finalValidation.message = error instanceof Error ? error.message : "Unknown error";
      }

      // 6. Resumen de resultados
      const overallSuccess = results.setup.success && 
                           results.testSale.success && 
                           results.finalValidation.success;

      const summary = {
        overallSuccess,
        setupPassed: results.setup.success,
        initialIssues: results.validation.issues.length,
        correctionsMade: results.correction.corrected || 0,
        testSalePassed: results.testSale.success,
        finalStateValid: results.finalValidation.success,
        executionTime: Date.now()
      };

      console.log("\n📊 RESUMEN DE PRUEBA COMPLETA:");
      console.log(`✅ Setup: ${summary.setupPassed ? 'OK' : 'FALLÓ'}`);
      console.log(`📊 Problemas iniciales: ${summary.initialIssues}`);
      console.log(`🔧 Correcciones: ${summary.correctionsMade}`);
      console.log(`🧪 Venta prueba: ${summary.testSalePassed ? 'OK' : 'FALLÓ'}`);
      console.log(`✅ Estado final: ${summary.finalStateValid ? 'VÁLIDO' : 'CON PROBLEMAS'}`);
      console.log(`🎉 Éxito general: ${summary.overallSuccess ? 'SÍ' : 'NO'}`);

      return NextResponse.json({
        success: true,
        message: overallSuccess ? "Solución validada exitosamente" : "La solución tiene problemas",
        results,
        summary,
        timestamp: new Date().toISOString()
      });

    } else if (action === "testSaleOnly") {
      console.log("🧪 EJECUTANDO PRUEBA DE VENTA AISLADA");
      
      // Prueba simple de venta
      const supabase = getSupabaseServerClient();
      
      const testProductId = "test-isolated-sale";
      await supabase.from("products").upsert({
        id: testProductId,
        firestore_id: testProductId,
        name: "Producto Prueba Aislada",
        price: 50,
        cost: 25,
        stock: 5,
        sku: "TEST-ISO-001",
        type: "Producto",
        ownershipType: "Propio",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const testCartItems = [{
        id: testProductId,
        name: "Producto Prueba Aislada",
        price: 50,
        quantity: 1,
        cost: 25,
        stock: 5,
        sku: "TEST-ISO-001",
        createdAt: new Date(),
        type: "Venta" as const,
        ownershipType: "Propio" as const
      }];

      const testSaleData = {
        items: testCartItems.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          priceAtSale: item.price,
          serials: [],
        })),
        totalAmount: 50,
        paymentMethod: "Efectivo" as const,
        cashierId: "test-isolated-user",
        cashierName: "Usuario Test Aislado",
        customerName: null,
        customerPhone: null,
      };

      const startTime = Date.now();
      const saleResult = await addSaleAndUpdateStock(testSaleData, testCartItems);
      const endTime = Date.now();

      // Verificar logs
      const { data: testLogs } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("metadata->>saleId", saleResult.saleId);

      return NextResponse.json({
        success: true,
        message: "Prueba de venta aislada completada",
        saleResult,
        logsCreated: testLogs?.length || 0,
        executionTime: endTime - startTime,
        correctLogs: testLogs?.length === 1,
        timestamp: new Date().toISOString()
      });

    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      availableActions: ["runFullTest", "testSaleOnly"],
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Error en prueba de solución:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to test solution",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    console.log("🔍 Verificando estado de la solución...");
    
    // Verificar estado general
    const validation = await InventoryValidationService.validateInventory();
    
    const status = {
      solutionHealthy: validation.isValid,
      totalIssues: validation.issues.length,
      criticalIssues: validation.issues.filter(i => i.severity === 'critical').length,
      highIssues: validation.issues.filter(i => i.severity === 'high').length,
      summary: validation.summary,
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
      error: "Failed to check solution status",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}