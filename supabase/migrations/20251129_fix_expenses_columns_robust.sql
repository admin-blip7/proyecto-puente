-- Fix expenses table column names to match code expectations (Quoted CamelCase)

DO $$
BEGIN
    -- 1. Handle receiptUrl
    -- If receipt_url exists, rename it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'receipt_url') THEN
        ALTER TABLE public.expenses RENAME COLUMN receipt_url TO "receiptUrl";
    -- If receipturl exists, rename it
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'receipturl') THEN
        ALTER TABLE public.expenses RENAME COLUMN receipturl TO "receiptUrl";
    -- If neither exists and "receiptUrl" doesn't exist, create it
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'receiptUrl') THEN
        ALTER TABLE public.expenses ADD COLUMN "receiptUrl" TEXT;
    END IF;

    -- 2. Handle expenseId
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'expense_id') THEN
        ALTER TABLE public.expenses RENAME COLUMN expense_id TO "expenseId";
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'expenseid') THEN
        ALTER TABLE public.expenses RENAME COLUMN expenseid TO "expenseId";
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'expenseId') THEN
        ALTER TABLE public.expenses ADD COLUMN "expenseId" TEXT;
    END IF;

    -- 3. Handle sessionId
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'session_id') THEN
        ALTER TABLE public.expenses RENAME COLUMN session_id TO "sessionId";
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'sessionid') THEN
        ALTER TABLE public.expenses RENAME COLUMN sessionid TO "sessionId";
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'sessionId') THEN
        ALTER TABLE public.expenses ADD COLUMN "sessionId" TEXT;
    END IF;

    -- 4. Handle paymentDate
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'payment_date') THEN
        ALTER TABLE public.expenses RENAME COLUMN payment_date TO "paymentDate";
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'paymentdate') THEN
        ALTER TABLE public.expenses RENAME COLUMN paymentdate TO "paymentDate";
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'paymentDate') THEN
        ALTER TABLE public.expenses ADD COLUMN "paymentDate" TIMESTAMPTZ DEFAULT now();
    END IF;

    -- 5. Handle paidFromAccountId (already checked previously, but good to be safe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'paid_from_account_id') THEN
        ALTER TABLE public.expenses RENAME COLUMN paid_from_account_id TO "paidFromAccountId";
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'paidfromaccountid') THEN
        ALTER TABLE public.expenses RENAME COLUMN paidfromaccountid TO "paidFromAccountId";
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'paidFromAccountId') THEN
        ALTER TABLE public.expenses ADD COLUMN "paidFromAccountId" TEXT;
    END IF;

END $$;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
