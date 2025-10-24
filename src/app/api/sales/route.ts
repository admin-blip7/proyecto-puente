import { NextResponse } from "next/server";
import { addSaleAndUpdateStock } from "@/lib/services/salesService";
import { CartItem, Sale, SaleItem } from "@/types";
import { getLogger } from "@/lib/logger";

const log = getLogger("salesAPI");

export async function POST(request: Request) {
  try {
    log.info("Sales API endpoint called");
    
    const body = await request.json();
    const { saleData, cartItems } = body;

    // Validar datos requeridos
    if (!saleData || !cartItems || !Array.isArray(cartItems)) {
      return NextResponse.json({
        success: false,
        error: "Datos de venta inválidos",
        details: "saleData y cartItems son requeridos"
      }, { status: 400 });
    }

    // Validar que cartItems no esté vacío
    if (cartItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: "El carrito está vacío",
        details: "Se requiere al menos un producto para realizar la venta"
      }, { status: 400 });
    }

    log.info(`Processing sale with ${cartItems.length} items`);
    log.info(`Sale data:`, { 
      totalAmount: saleData.totalAmount, 
      paymentMethod: saleData.paymentMethod,
      cashierId: saleData.cashierId 
    });

    // Procesar la venta
    const result = await addSaleAndUpdateStock(saleData, cartItems);

    log.info(`Sale processed successfully: ${result.saleId}`);

    return NextResponse.json({
      success: true,
      message: "Venta procesada exitosamente",
      sale: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    log.error("Error processing sale:", error);
    
    return NextResponse.json({
      success: false,
      error: "Error al procesar la venta",
      details: error.message || "Error interno del servidor",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Método GET para obtener ventas
export async function GET() {
  try {
    const { getSales } = await import("@/lib/services/salesService");
    const sales = await getSales();

    return NextResponse.json({
      success: true,
      data: sales,
      count: sales.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    log.error("Error getting sales:", error);
    return NextResponse.json({
      success: false,
      error: "Error al obtener las ventas",
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}