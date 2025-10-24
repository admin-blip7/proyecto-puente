import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();

    // Buscar un producto con consignorId
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*')
      .not('consignor_id', 'is', null)
      .limit(1);

    if (productError || !products || products.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos de consignación' },
        { status: 404 }
      );
    }

    const product = products[0];
    console.log('Producto encontrado:', product);

    // Crear una venta de prueba
    const saleData = {
      items: [{
        productId: product.firestore_id,
        name: product.name,
        quantity: 1,
        priceAtSale: product.price || 1000000,
      }],
      totalAmount: product.price || 1000000,
      paymentMethod: 'Efectivo' as const,
      cashierId: 'test-cashier',
      cashierName: 'Cajero de Prueba',
      customerName: 'Cliente de Prueba',
      customerPhone: '123456789',
    };

    const cartItems = [{
      id: product.firestore_id,
      name: product.name,
      quantity: 1,
      price: product.price || 1000000,
    }];

    // Llamar al servicio de ventas
    const { addSaleAndUpdateStock } = await import('@/lib/services/salesService');
    const sale = await addSaleAndUpdateStock(saleData, cartItems);

    console.log('Venta creada:', sale);

    // Verificar que la venta tenga consignorId
    const hasConsignorId = sale.items.some(item => item.consignorId === product.consignor_id);

    return NextResponse.json({
      success: true,
      message: 'Venta de consignación creada exitosamente',
      sale: {
        id: sale.id,
        saleId: sale.saleId,
        totalAmount: sale.totalAmount,
        items: sale.items,
      },
      hasConsignorId,
      productConsignorId: product.consignor_id,
    });

  } catch (error) {
    console.error('Error en prueba de venta de consignación:', error);
    return NextResponse.json(
      {
        error: 'Error al crear venta de consignación',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}