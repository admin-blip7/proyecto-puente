-- Add missing balance tracking column to cash_sessions
ALTER TABLE cash_sessions
ADD COLUMN IF NOT EXISTS is_balanced BOOLEAN DEFAULT false;
