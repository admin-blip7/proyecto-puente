-- Add a partial unique index to prevent multiple open sessions per day
-- This ensures only one session can be open for a given calendar day (based on openedAt date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_session_per_day 
ON cash_sessions (date(opened_at AT TIME ZONE 'America/Mexico_City'))
WHERE status = 'Abierto';

-- Note: This index uses the Mexico City timezone to ensure sessions are grouped by local date
-- The index is partial (WHERE status = 'Abierto') so closed sessions don't conflict
