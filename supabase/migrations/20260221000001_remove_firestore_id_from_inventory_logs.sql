-- Remove firestore_id column from inventory_logs table
-- This column is legacy from Firebase and should not exist

DO $$
BEGIN
    -- Drop the column if it exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'inventory_logs'
        AND column_name = 'firestore_id'
    ) THEN
        ALTER TABLE public.inventory_logs DROP COLUMN firestore_id;
    END IF;
END $$;
