-- Add daily_sales_account_id column to cash_sessions table
-- This column is used to store the account ID for daily sales (日销售账户)
-- This is independent from the balance bag accounts

-- 1. Add daily_sales_account_id column to cash_sessions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cash_sessions'
        AND column_name = 'daily_sales_account_id'
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

-- 2. Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_cash_sessions_daily_sales_account
ON public.cash_sessions(daily_sales_account_id)
WHERE daily_sales_account_id IS NOT NULL;
