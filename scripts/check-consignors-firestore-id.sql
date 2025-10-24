-- Check if consignors table has firestore_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'consignors'
AND column_name = 'firestore_id';

-- If the column doesn't exist, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consignors'
        AND column_name = 'firestore_id'
    ) THEN
        ALTER TABLE public.consignors ADD COLUMN firestore_id TEXT UNIQUE;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_consignors_firestore_id ON public.consignors(firestore_id);
        
        -- Update existing consignors to have firestore_id if they don't
        UPDATE public.consignors
        SET firestore_id = gen_random_uuid()::text
        WHERE firestore_id IS NULL;
        
        RAISE NOTICE 'Added firestore_id column to consignors table';
    ELSE
        RAISE NOTICE 'firestore_id column already exists in consignors table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'consignors'
AND column_name = 'firestore_id';