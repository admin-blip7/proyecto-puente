import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST(request: NextRequest) {
  try {
    const { orderId, services, partsNeeded, repairSteps } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Preparar los datos para actualizar
    const updateData: any = {
      partsUsed: services || [], // Usar servicios como partsUsed
      updatedAt: new Date().toISOString()
    };

    // NOTA: repairSteps no se guarda en la base de datos porque la columna no existe
    // Solo se maneja en el estado del componente durante la sesión actual

    const { data, error } = await supabase
      .from('repair_orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating repair order details:', error);
      return NextResponse.json(
        { error: 'Failed to update details' },
        { status: 500 }
      );
    }

    // Mapear los datos al formato esperado
    const updatedOrder = {
      id: data?.id ?? "",
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
      // repairSteps se maneja solo en el cliente
      repairSteps: repairSteps || [],
      laborCost: Number(data?.laborCost ?? 0),
      totalCost: Number(data?.totalCost ?? 0),
      totalPrice: Number(data?.totalPrice ?? 0),
      profit: Number(data?.profit ?? 0),
      createdAt: data?.createdAt ? new Date(data.createdAt) : new Date(),
      completedAt: data?.completedAt ? new Date(data.completedAt) : undefined,
      updatedAt: data?.updatedAt ? new Date(data.updatedAt) : new Date(),
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