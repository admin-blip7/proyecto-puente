-- Migration: create email notification log table
-- REQ-014: Historial de notificaciones enviadas

CREATE TABLE IF NOT EXISTS public.email_notification_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id   UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  session_id  UUID,
  email_to    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  error_msg   TEXT,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_branch_id
  ON public.email_notification_log(branch_id);

COMMENT ON TABLE public.email_notification_log IS 'Log of email corte de caja notifications sent via Resend';
