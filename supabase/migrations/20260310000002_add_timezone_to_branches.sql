-- Migration: add timezone to branches table
-- Purpose: allow each branch to define its own IANA timezone for date-based workflows (cash cuts, history, notifications).

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS timezone TEXT;

UPDATE public.branches
SET timezone = 'America/Mexico_City'
WHERE timezone IS NULL OR btrim(timezone) = '';

ALTER TABLE public.branches
  ALTER COLUMN timezone SET DEFAULT 'America/Mexico_City';

COMMENT ON COLUMN public.branches.timezone IS 'IANA timezone for this branch (example: America/Mexico_City). Used for cash cut history and date grouping.';
