-- Add missing paidFromAccountId column to expenses table
-- This column is required for tracking which account an expense was paid from

DO $$
BEGIN
    -- Check if the column doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'paidFromAccountId'
    ) THEN
        ALTER TABLE public.expenses 
        ADD COLUMN "paidFromAccountId" TEXT;
        
        RAISE NOTICE 'Added paidFromAccountId column to expenses table';
    ELSE
        RAISE NOTICE 'paidFromAccountId column already exists';
    END IF;
END $$;
