import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import { buildCorteEmailHtml, sendCorteEmail } from '@/lib/services/emailNotificationService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.sessionId || !body?.branchId) {
      return NextResponse.json({ ok: false, error: 'invalid_body' });
    }
    const { sessionId, branchId } = body;

    const supabase = getSupabaseServerClient();

    // 1. Get branch email (server-side only)
    const { data: branch } = await supabase
      .from('branches')
      .select('notification_email, name')
      .eq('id', branchId)
      .maybeSingle();

    if (!branch?.notification_email) {
      return NextResponse.json({ ok: false, error: 'no_email' });
    }

    // 2. Get session data
    const { data: sessionRaw } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!sessionRaw) {
      return NextResponse.json({ ok: false, error: 'session_not_found' });
    }

    // Convert snake_case to camelCase
    const session = {
      id: sessionRaw.id,
      sessionId: sessionRaw.session_id,
      status: sessionRaw.status,
      openedBy: sessionRaw.opened_by,
      openedByName: sessionRaw.opened_by_name,
      openedAt: sessionRaw.opened_at,
      startingFloat: sessionRaw.starting_float,
      closedBy: sessionRaw.closed_by,
      closedByName: sessionRaw.closed_by_name,
      closedAt: sessionRaw.closed_at,
      totalCashSales: sessionRaw.total_cash_sales,
      totalCardSales: sessionRaw.total_card_sales,
      totalCashPayouts: sessionRaw.total_cash_payouts,
      expectedCashInDrawer: sessionRaw.expected_cash_in_drawer,
      actualCashCount: sessionRaw.actual_cash_count,
      difference: sessionRaw.difference,
    };

    // 3. Get sales for this session (with items)
    const { data: salesRaw = [] } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('session_id', sessionId);

    // Convert sales from snake_case to camelCase
    const sales = salesRaw.map((s: Record<string, unknown>) => ({
      id: s.id,
      saleId: s.sale_number,
      items: Array.isArray((s as Record<string, unknown>).sale_items) 
        ? ((s as Record<string, unknown>).sale_items as Record<string, unknown>[]).map((item: Record<string, unknown>) => ({
            productId: item.product_id,
            name: item.product_name || 'Producto',
            quantity: item.quantity,
            priceAtSale: item.unit_price,
          }))
        : [],
      totalAmount: s.total_amount,
      paymentMethod: s.payment_method,
      status: s.status,
      cashierName: s.cashier_name,
      createdAt: s.created_at,
    }));

    // 4. Build email
    const html = buildCorteEmailHtml({ session, sales: sales ?? [], branchName: branch.name });
    const dateStr = format(new Date(session.closedAt ?? session.openedAt), "dd/MM/yyyy HH:mm", { locale: es });
    const subject = `Corte de Caja — ${branch.name} — ${dateStr}`;

    // 5. Send via Resend
    const result = await sendCorteEmail({ to: branch.notification_email, subject, html });

    // 6. Log result
    await supabase.from('email_notification_log').insert({
      branch_id: branchId,
      session_id: sessionId,
      email_to: branch.notification_email,
      status: result.ok ? 'sent' : 'failed',
      error_msg: result.error ?? null,
    });

    return NextResponse.json({ ok: result.ok, error: result.error ?? null });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[email/corte] unhandled error:', msg);
    return NextResponse.json({ ok: false, error: msg });
  }
}
