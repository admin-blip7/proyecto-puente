-- Add missing id column to expenses table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'id') THEN
        ALTER TABLE public.expenses ADD COLUMN id UUID DEFAULT gen_random_uuid();
        -- Set as primary key if no PK exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc 
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
            WHERE tc.table_name = 'expenses' AND tc.constraint_type = 'PRIMARY KEY'
        ) THEN
            ALTER TABLE public.expenses ADD PRIMARY KEY (id);
        END IF;
    END IF;
END $$;
