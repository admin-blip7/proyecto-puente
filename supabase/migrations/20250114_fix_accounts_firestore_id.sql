-- Fix accounts table to ensure firestore_id column exists
-- This migration fixes the schema cache issue

-- Ensure accounts table exists with proper structure
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Banco'::text,
    current_balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND table_schema = 'public'
        AND column_name = 'firestore_id'
    ) THEN
        ALTER TABLE public.accounts ADD COLUMN firestore_id TEXT UNIQUE;
    END IF;
END $$;

-- Update existing accounts to have firestore_id if they don't
UPDATE public.accounts
SET firestore_id = gen_random_uuid()::text
WHERE firestore_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_accounts_firestore_id ON public.accounts(firestore_id);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.accounts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.accounts;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.accounts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.accounts;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.accounts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.accounts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.accounts FOR DELETE USING (auth.role() = 'authenticated');