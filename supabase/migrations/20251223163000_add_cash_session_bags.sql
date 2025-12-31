-- Add bag tracking columns to cash_sessions table
ALTER TABLE cash_sessions
ADD COLUMN IF NOT EXISTS bags_start_amounts JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS bags_sales_amounts JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS bags_end_amounts JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS previous_session_confirmed_at TIMESTAMPTZ;
