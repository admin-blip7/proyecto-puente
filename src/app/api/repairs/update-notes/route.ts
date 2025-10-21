import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST(request: NextRequest) {
  try {
    const { orderId, technicianNotes } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Primero intentar encontrar por firestore_id
    let { data, error } = await supabase
      .from('repair_orders')
      .update({
        technicianNotes: technicianNotes || null,
      })
      .eq('firestore_id', orderId)
      .select('*')
      .single();

    // Si no funciona, intentar por id (para casos donde sea UUID)
    if (error && error.code === 'PGRST116') {
      const result = await supabase
        .from('repair_orders')
        .update({
          technicianNotes: technicianNotes || null,
        })
        .eq('id', orderId)
        .select('*')
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error updating technician notes:', error);
      return NextResponse.json(
        { error: 'Failed to update notes' },
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