-- Create income_categories table
CREATE TABLE IF NOT EXISTS income_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firestore_id TEXT UNIQUE,
    name TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create incomes table
CREATE TABLE IF NOT EXISTS incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firestore_id TEXT UNIQUE,
    "incomeId" TEXT,
    description TEXT,
    category TEXT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    "destinationAccountId" TEXT,
    source TEXT,
    "paymentDate" TIMESTAMPTZ DEFAULT now(),
    "receiptUrl" TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firestore_id TEXT UNIQUE,
    "transferId" TEXT,
    "sourceAccountId" TEXT,
    "destinationAccountId" TEXT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    description TEXT,
    "transferDate" TIMESTAMPTZ DEFAULT now(),
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Create policies (Drop first to avoid errors if re-running)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON income_categories;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON income_categories;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON income_categories;

CREATE POLICY "Enable read access for authenticated users" ON income_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON income_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON income_categories FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON incomes;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON incomes;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON incomes;

CREATE POLICY "Enable read access for authenticated users" ON incomes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON incomes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON incomes FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON transfers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON transfers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON transfers;

CREATE POLICY "Enable read access for authenticated users" ON transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON transfers FOR UPDATE TO authenticated USING (true);

-- Insert default income categories
INSERT INTO income_categories (firestore_id, name, "isActive") VALUES
(uuid_generate_v4()::text, 'Ventas', true),
(uuid_generate_v4()::text, 'Inversión', true),
(uuid_generate_v4()::text, 'Préstamo', true),
(uuid_generate_v4()::text, 'Reembolso', true),
(uuid_generate_v4()::text, 'Otro', true)
ON CONFLICT (firestore_id) DO NOTHING;
