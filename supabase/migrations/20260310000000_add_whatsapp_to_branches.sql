-- Migration: add notification_email to branches table
-- REQ-008: Email de notificaciones configurable por sucursal

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS notification_email TEXT;

COMMENT ON COLUMN public.branches.notification_email IS 'Email address to receive automatic corte de caja notifications. NULL = notifications disabled for this branch.';
