import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import { buildCorteMessage } from '@/lib/services/whatsappNotificationService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.sessionId || !body?.branchId) {
      return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 200 });
    }
    const { sessionId, branchId } = body;

    const supabase = getSupabaseServerClient();

    // 1. Get branch WhatsApp credentials (server-side only — never exposed to client)
    const { data: branch } = await supabase
      .from('branches')
      .select('whatsapp_number, whatsapp_apikey, name')
      .eq('id', branchId)
      .maybeSingle();

    if (!branch?.whatsapp_number || !branch?.whatsapp_apikey) {
      return NextResponse.json({ ok: false, error: 'no_number' }, { status: 200 });
    }

    // 2. Get session data
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 200 });
    }

    // 3. Get sales for this session
    const { data: sales = [] } = await supabase
      .from('sales')
      .select('*')
      .eq('session_id', sessionId);

    // 4. Build message text
    const message = buildCorteMessage({ session, sales: sales ?? [], branchName: branch.name });

    // 5. Send via Callmebot (plain GET fetch — no npm package needed per user decision)
    const callmebotUrl = `https://api.callmebot.com/whatsapp.php?phone=${branch.whatsapp_number}&text=${encodeURIComponent(message)}&apikey=${branch.whatsapp_apikey}`;
    const callmebotRes = await fetch(callmebotUrl);
    const callmebotOk = callmebotRes.ok;
    const errorText = callmebotOk ? null : await callmebotRes.text().catch(() => 'unknown_error');

    // 6. Log result (REQ-014)
    await supabase.from('whatsapp_notification_log').insert({
      branch_id: branchId,
      session_id: sessionId,
      phone_to: branch.whatsapp_number,
      status: callmebotOk ? 'sent' : 'failed',
      error_msg: errorText,
    });

    return NextResponse.json({ ok: callmebotOk, error: errorText });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[whatsapp/corte] unhandled error:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}
