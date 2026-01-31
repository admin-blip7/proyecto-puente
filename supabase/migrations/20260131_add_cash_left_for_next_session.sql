
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_sessions' AND column_name = 'cash_left_for_next_session') THEN 
        ALTER TABLE "cash_sessions" ADD COLUMN "cash_left_for_next_session" numeric DEFAULT 0; 
    END IF; 
END $$;
