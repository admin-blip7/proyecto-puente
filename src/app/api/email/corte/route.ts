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
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ ok: false, error: 'session_not_found' });
    }

    // 3. Get sales for this session
    const { data: sales = [] } = await supabase
      .from('sales')
      .select('*')
      .eq('session_id', sessionId);

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
