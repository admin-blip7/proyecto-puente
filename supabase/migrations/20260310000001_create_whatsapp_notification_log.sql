-- Migration: create WhatsApp notification log table
-- REQ-014: Historial de notificaciones enviadas (opcional)

CREATE TABLE IF NOT EXISTS public.whatsapp_notification_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  session_id  UUID,
  phone_to    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  error_msg   TEXT,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_log_branch_id
  ON public.whatsapp_notification_log(branch_id);

COMMENT ON TABLE public.whatsapp_notification_log IS 'Log of WhatsApp corte notifications sent via Callmebot';
