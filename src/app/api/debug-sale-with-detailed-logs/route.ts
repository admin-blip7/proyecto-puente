import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { addSaleAndUpdateStock } from "@/lib/services/salesService-with-debug-logs";
import { CartItem, SaleItem } from "@/types";

export async function POST(request: Request) {
  try {
    console.log("🚀 DEBUG SALE WITH DETAILED LOGS endpoint called");

    const body = await request.json();
    const { action, testData } = body;

    if (action === "simulateSaleWithDetailedLogs") {
      console.log("📦 INICIANDO SIMULACIÓN DE VENTA CON LOGS DETALLADOS");

      // Simular datos de venta como los que enviaría el componente POS
      const mockCartItems: CartItem[] = [
        {
          id: "test-product-debug",
          name: "Producto de Debug",
          price: 50,
          quantity: 1,
          cost: 25,
          stock: 10,
          sku: "DEBUG-001",
          createdAt: new Date(),
          type: "Refacción",
          ownershipType: "Propio"
        }
      ];

      const mockSaleData = {
        items: mockCartItems.map(item => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          priceAtSale: item.price,
          serials: [],
        })) as SaleItem[],
        totalAmount: 50,
        paymentMethod: "Efectivo" as const,
        cashierId: "debug-user-id",
        cashierName: "Usuario Debug",
        customerName: null,
        customerPhone: null,
      };

      console.log("📊 Datos de venta simulada:", JSON.stringify(mockSaleData, null, 2));

      try {
        // Primero verificar si existe el producto de prueba
        const supabase = getSupabaseServerClient();
        console.log("🔍 Verificando producto de prueba...");

        const { data: existingProduct, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", "test-product-debug")
          .maybeSingle();

        if (productError) {
          console.error("❌ Error checking for test product:", productError);
        }

        if (!existingProduct) {
          console.log("📝 Creando producto de prueba...");
          const { data: newProduct, error: createError } = await supabase
            .from("products")
            .insert({
              id: "test-product-debug",

              name: "Producto de Debug",
              price: 50,
              cost: 25,
              stock: 10,
              sku: "DEBUG-001",
              type: "Producto",
              ownershipType: "Propio",
              reorderPoint: 5,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.error("❌ Error creating test product:", createError);
            return NextResponse.json({
              success: false,
              error: "Failed to create test product",
              details: createError.message
            }, { status: 500 });
          }

          console.log("✅ Test product created:", newProduct);
        } else {
          console.log("✅ Test product found:", existingProduct.name, "Stock:", existingProduct.stock);
        }

        // Verificar logs existentes antes de la venta
        console.log("🔍 Verificando logs existentes antes de la venta...");
        const { data: existingLogs, error: logsError } = await supabase
          .from("inventory_logs")
          .select("*")
          .eq("productId", "test-product-debug")
          .order("createdAt", { ascending: false })
          .limit(5);

        if (!logsError) {
          console.log(`📊 Logs existentes: ${existingLogs?.length || 0}`);
          existingLogs?.forEach((log, index) => {
            console.log(`  ${index + 1}. ${log.reason}: ${log.change} at ${log.createdAt}`);
          });
        }

        console.log("🚀 EJECUTANDO addSaleAndUpdateStock con logs detallados...");

        // Medir tiempo de ejecución
        const startTime = Date.now();
        const result = await addSaleAndUpdateStock(mockSaleData, mockCartItems);
        const endTime = Date.now();

        console.log(`⏱️ Tiempo de ejecución: ${endTime - startTime}ms`);
        console.log("✅ Sale created successfully:", result);

        // Verificar logs después de la venta
        console.log("🔍 Verificando logs después de la venta...");
        const { data: newLogs, error: newLogsError } = await supabase
          .from("inventory_logs")
          .select("*")
          .eq("productId", "test-product-debug")
          .order("createdAt", { ascending: false })
          .limit(10);

        if (!newLogsError) {
          console.log(`📊 Logs después de la venta: ${newLogs?.length || 0}`);
          newLogs?.forEach((log, index) => {
            console.log(`  ${index + 1}. ${log.reason}: ${log.change} at ${log.createdAt} | Metadata: ${JSON.stringify(log.metadata)}`);
          });

          // Contar logs creados en los últimos 5 segundos
          const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
          const recentLogs = newLogs?.filter(log => log.createdAt > fiveSecondsAgo) || [];
          console.log(`🚨 Logs creados en los últimos 5 segundos: ${recentLogs.length}`);

          if (recentLogs.length > 1) {
            console.log("🚨🚨🚨 PROBLEMA DETECTADO: MÚLTIPLES LOGS CREADOS 🚨🚨🚨");
            recentLogs.forEach((log, index) => {
              console.log(`  ${index + 1}. Timestamp: ${log.createdAt} | Change: ${log.change} | OperationID: ${log.metadata?.operationId}`);
            });
          }
        }

        // Verificar estado final del producto
        console.log("🔍 Verificando estado final del producto...");
        const { data: finalProduct, error: finalProductError } = await supabase
          .from("products")
          .select("*")
          .eq("id", "test-product-debug")
          .maybeSingle();

        if (!finalProductError && finalProduct) {
          console.log(`📊 Stock final: ${finalProduct.stock} (esperado: ${existingProduct?.stock - 1})`);

          if (finalProduct.stock !== (existingProduct?.stock - 1)) {
            console.log("🚨🚨🚨 PROBLEMA DE STOCK DETECTADO 🚨🚨🚨");
            console.log(`Expected: ${existingProduct?.stock - 1}, Actual: ${finalProduct.stock}`);
            console.log(`Difference: ${finalProduct.stock - (existingProduct?.stock - 1)}`);
          }
        }

        return NextResponse.json({
          success: true,
          message: "Sale simulation with detailed logs completed",
          saleData: result,
          executionTime: endTime - startTime,
          logsCreated: newLogs?.length || 0,
          timestamp: new Date().toISOString()
        });

      } catch (saleError) {
        console.error("❌ Error in addSaleAndUpdateStock:", saleError);
        return NextResponse.json({
          success: false,
          error: "Sale creation failed",
          details: saleError instanceof Error ? saleError.message : "Unknown error",
          stack: saleError instanceof Error ? saleError.stack : undefined,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      availableActions: ["simulateSaleWithDetailedLogs"],
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Debug sale endpoint error:", error);
    return NextResponse.json({
      success: false,
      error: "Unexpected error in debug endpoint",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}