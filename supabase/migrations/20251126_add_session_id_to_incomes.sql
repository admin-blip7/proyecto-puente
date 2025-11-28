-- Add sessionId column to incomes table
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
