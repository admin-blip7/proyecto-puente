import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST(request: NextRequest) {
  try {
    const { orderId, status, completedAt } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    let data;
    let error;

    // Si el estado es Completado, usar la función RPC para manejar la lógica de negocio (ganancias)
    if (status === 'Completado') {
      const result = await supabase.rpc('collect_repair_profit', {
        p_repair_id: orderId
      });
      data = result.data;
      error = result.error;
    } else {
      // Para otros estados, usar la actualización normal
      // Primero intentar encontrar por firestore_id
      const result1 = await supabase
        .from('repair_orders')
        .update({
          status,
          completedAt: completedAt || null,
        })
        .eq('firestore_id', orderId)
        .select('*')
        .single();

      data = result1.data;
      error = result1.error;

      // Si no funciona, intentar por id (para casos donde sea UUID)
      if (error && error.code === 'PGRST116') {
        const result2 = await supabase
          .from('repair_orders')
          .update({
            status,
            completedAt: completedAt || null,
          })
          .eq('id', orderId)
          .select('*')
          .single();

        data = result2.data;
        error = result2.error;
      }
    }

    if (error) {
      console.error('Error updating repair order status:', error);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    // Mapear los datos al formato esperado
    const updatedOrder = {
      id: data?.firestore_id ?? data?.id ?? "",
      orderId: data?.orderId ?? "",
      status: data?.status ?? "Recibido",
      customerName: data?.customerName ?? "",
      customerPhone: data?.customerPhone ?? "",
      deviceBrand: data?.deviceBrand ?? "",
      deviceModel: data?.deviceModel ?? "",
      deviceSerialIMEI: data?.deviceSerialIMEI ?? "",
      reportedIssue: data?.reportedIssue ?? "",
      technicianNotes: data?.technicianNotes ?? undefined,
      partsUsed: Array.isArray(data?.partsUsed) ? data.partsUsed : [],
      laborCost: Number(data?.laborCost ?? 0),
      totalCost: Number(data?.totalCost ?? 0),
      totalPrice: Number(data?.totalPrice ?? 0),
      profit: Number(data?.profit ?? 0),
      createdAt: data?.createdAt ? new Date(data.createdAt) : new Date(),
      completedAt: data?.completedAt ? new Date(data.completedAt) : undefined,
    };

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}