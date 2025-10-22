import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { addSaleAndUpdateStock } from "@/lib/services/salesService";
import { CartItem, SaleItem } from "@/types";

export async function POST(request: Request) {
  try {
    console.log("Debug sale endpoint called");
    
    const body = await request.json();
    const { action, testData } = body;

    if (action === "simulateSale") {
      // Simular datos de venta como los que enviaría el componente POS
      const mockCartItems: CartItem[] = [
        {
          id: "test-product-1",
          name: "Producto de Prueba",
          price: 100,
          quantity: 1,
          cost: 50,
          stock: 10,
          sku: "TEST-001",
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
        totalAmount: 100,
        paymentMethod: "Efectivo" as const,
        cashierId: "test-user-id",
        cashierName: "Usuario de Prueba",
        customerName: null,
        customerPhone: null,
      };

      console.log("Attempting to create sale with data:", mockSaleData);

      try {
        // Primero verificar si existe el producto de prueba
        const supabase = getSupabaseServerClient();
        const { data: existingProduct, error: productError } = await supabase
          .from("products")
          .select("*")
          .eq("id", "test-product-1")
          .maybeSingle();

        if (productError) {
          console.error("Error checking for test product:", productError);
        }

        if (!existingProduct) {
          // Crear producto de prueba
          console.log("Creating test product...");
          const { data: newProduct, error: createError } = await supabase
            .from("products")
            .insert({
              id: "test-product-1",
              firestore_id: "test-product-1",
              name: "Producto de Prueba",
              price: 100,
              cost: 50,
              stock: 10,
              sku: "TEST-001",
              type: "Producto",
              ownershipType: "Propio",
              reorderPoint: 5,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating test product:", createError);
            return NextResponse.json({
              success: false,
              error: "Failed to create test product",
              details: createError.message
            }, { status: 500 });
          }

          console.log("Test product created:", newProduct);
        }

        // Intentar crear la venta
        const result = await addSaleAndUpdateStock(mockSaleData, mockCartItems);
        
        console.log("Sale created successfully:", result);

        return NextResponse.json({
          success: true,
          message: "Sale simulation successful",
          saleData: result,
          timestamp: new Date().toISOString()
        });

      } catch (saleError) {
        console.error("Error in addSaleAndUpdateStock:", saleError);
        return NextResponse.json({
          success: false,
          error: "Sale creation failed",
          details: saleError instanceof Error ? saleError.message : "Unknown error",
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
    }

    if (action === "checkUserAuth") {
      // Simular verificación de autenticación
      return NextResponse.json({
        success: true,
        message: "User auth check - this would normally require client-side auth",
        note: "Server-side cannot access client auth state directly",
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      availableActions: ["simulateSale", "checkUserAuth"],
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    console.error("Debug sale endpoint error:", error);
    return NextResponse.json({
      success: false,
      error: "Unexpected error in debug endpoint",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}