-- Fix expenses table schema
-- Ensure paymentDate is TIMESTAMP WITH TIME ZONE
-- Handles conversion from Firestore JSON format {"_seconds": ...}

DO $$
BEGIN
    -- Check if paymentDate is not a timestamp
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'paymentDate' 
        AND data_type NOT IN ('timestamp with time zone', 'timestamp without time zone')
    ) THEN
        ALTER TABLE public.expenses 
        ALTER COLUMN "paymentDate" TYPE TIMESTAMP WITH TIME ZONE 
        USING (
            CASE 
                -- Handle Firestore format: {"_seconds": 123, ...}
                WHEN "paymentDate"::text LIKE '%_seconds%' THEN
                    to_timestamp(
                        COALESCE(
                            ("paymentDate"::json->>'_seconds')::bigint, 
                            EXTRACT(EPOCH FROM NOW())::bigint
                        )
                    )
                -- Handle ISO string or other formats
                ELSE
                    -- Try to cast directly, trimming quotes if it's a JSON string
                    TRIM(BOTH '"' FROM "paymentDate"::text)::TIMESTAMP WITH TIME ZONE
            END
        );
    END IF;
END $$;
