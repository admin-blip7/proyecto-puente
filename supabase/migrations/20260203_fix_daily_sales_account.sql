-- Fix: Add daily_sales_account_id column if it doesn't exist
-- This migration ensures the column exists for storing daily sales account ID

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'cash_sessions'
        AND column_name = 'daily_sales_account_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.cash_sessions
        ADD COLUMN daily_sales_account_id TEXT;

        COMMENT ON COLUMN public.cash_sessions.daily_sales_account_id IS
        'ID de la cuenta de finanzas donde se registran las ventas diarias (日销售账户). Esta es independiente de las bolsas de saldo.';

        RAISE NOTICE 'Added daily_sales_account_id column to cash_sessions table';
    ELSE
        RAISE NOTICE 'daily_sales_account_id column already exists in cash_sessions table';
    END IF;
END $$;
