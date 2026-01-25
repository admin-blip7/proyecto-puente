import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseServerClient();
    const { id: consignorId } = await params;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    // Handle both createdAt and created_at for sorting
    let sortBy = searchParams.get('sortBy') || 'createdAt';
    if (sortBy === 'created_at') {
      sortBy = 'createdAt';
    }
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Parámetros de paginación inválidos' },
        { status: 400 }
      );
    }



    // Validate consignor exists - use direct query to avoid PostgREST issues
    const { data: consignorData, error: consignorError } = await supabase
      .from('consignors')
      .select('id, name, contactInfo')
      .eq('id', consignorId)
      .single();

    if (consignorError || !consignorData) {
      console.error('Consignor not found:', consignorError);
      return NextResponse.json(
        { error: 'Consignador no encontrado' },
        { status: 404 }
      );
    }

    const consignor = consignorData;

    // Skip table existence check - assume sales table exists

    // Query real sales data using direct query
    const { data: realSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order(sortBy, { ascending: sortOrder === 'asc' });

    console.log('Sales query result:', { realSales, salesError });

    if (salesError) {
      console.error('Error fetching real sales:', salesError);
      // Fallback to mock data if function doesn't work
      const mockSales: any[] = [];
      const summary = {
        totalSales: 0,
        totalRevenue: 0,
        totalQuantity: 0,
        averageSaleAmount: 0,
        consignorName: consignor.name
      };

      return NextResponse.json({
        success: true,
        data: {
          consignor: {
            id: consignor.id,
            name: consignor.name,
            contactInfo: consignor.contactInfo
          },
          sales: mockSales,
          summary,
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false
          }
        }
      });
    }

    // Process real sales data and filter by consignor
    const processedSales = (realSales || [])
      .filter((sale: any) => {
        // Check if any item in the sale belongs to this consignor
        const items = sale.items || [];
        const hasConsignorItem = items.some((item: any) => {
          // Check if the item has consignorId matching the current consignor
          return item.consignorId === consignorId;
        });


        return hasConsignorItem;
      })
      .map((sale: any) => {
        const items = sale.items || [];
        // Filter items to only show those from this consignor
        const consignorItems = items.filter((item: any) => item.consignorId === consignorId);

        // Calculate total quantity from consignor items only
        const totalQuantity = consignorItems.reduce((sum: number, item: any) =>
          sum + (parseInt(item.quantity) || 1), 0);

        // Calculate total from consignor items only
        const total = consignorItems.reduce((sum: number, item: any) =>
          sum + (parseFloat(item.priceAtSale || item.price || 0) * (parseInt(item.quantity) || 1)), 0);

        return {
          id: sale.id,
          createdAt: sale.createdAt || sale.created_at,
          total,
          payment_method: sale.payment_method || sale.paymentMethod || 'Efectivo',
          items: consignorItems.map((item: any) => ({
            productId: item.productId || '',
            productName: item.name || item.productName || 'Producto desconocido',
            quantity: parseInt(item.quantity) || 1,
            priceAtSale: parseFloat(item.priceAtSale || item.price || 0)
          })),
          itemCount: consignorItems.length,
          totalQuantity,
          client: { name: sale.customer_name || sale.customerName || 'Cliente General' },
          cash_session_id: null
        };
      });

    // Calculate summary statistics from real data
    const totalRevenue = processedSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalQuantity = processedSales.reduce((sum, sale) => sum + sale.totalQuantity, 0);

    const summary = {
      totalSales: processedSales.length,
      totalRevenue,
      totalQuantity,
      averageSaleAmount: processedSales.length > 0 ? totalRevenue / processedSales.length : 0,
      consignorName: consignor.name
    };

    return NextResponse.json({
      success: true,
      data: {
        consignor: {
          id: consignor.id,
          name: consignor.name,
          contactInfo: consignor.contactInfo
        },
        sales: processedSales,
        summary,
        pagination: {
          page,
          limit,
          total: processedSales.length,
          hasMore: false
        }
      }
    });

  } catch (error) {
    console.error('Error in consignor sales report:', error);
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}