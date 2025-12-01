-- Create expenses table with correct schema
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firestore_id TEXT UNIQUE,
    "expenseId" TEXT,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    "paidFromAccountId" TEXT,
    "paymentDate" TIMESTAMPTZ DEFAULT now(),
    "receiptUrl" TEXT,
    "sessionId" TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.expenses;

CREATE POLICY "Enable read access for authenticated users" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON public.expenses FOR DELETE TO authenticated USING (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_payment_date ON public.expenses("paymentDate");
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_session_id ON public.expenses("sessionId");
