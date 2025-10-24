-- Check if cash_sessions table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    opening_amount DECIMAL(15,2) DEFAULT 0,
    closing_amount DECIMAL(15,2) DEFAULT 0,
    expected_amount DECIMAL(15,2) DEFAULT 0,
    difference DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_sessions_firestore_id ON public.cash_sessions(firestore_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user_id ON public.cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at ON public.cash_sessions(opened_at);

-- Enable RLS
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cash_sessions'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.cash_sessions FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cash_sessions'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.cash_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cash_sessions'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.cash_sessions FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cash_sessions'
          AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.cash_sessions FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create trigger for updated_at
CREATE TRIGGER update_cash_sessions_updated_at
    BEFORE UPDATE ON public.cash_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cash_sessions'
ORDER BY ordinal_position;