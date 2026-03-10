-- Registro historico de sesiones por sucursal para usuarios multi-sucursal
CREATE TABLE IF NOT EXISTS public.user_branch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_user_branch_sessions_user_active
  ON public.user_branch_sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_branch_sessions_branch
  ON public.user_branch_sessions(branch_id);
