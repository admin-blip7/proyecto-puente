-- Script para crear las tablas debts y fixed_assets
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla debts si no existe
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT,
    creditorName TEXT NOT NULL,
    debtType TEXT DEFAULT 'Otro',
    currentBalance DECIMAL(15,2) DEFAULT 0,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    totalLimit DECIMAL(15,2),
    closingDate TEXT,
    paymentDueDate TEXT,
    interestRate DECIMAL,
    cat DECIMAL
);

-- 2. Crear tabla fixed_assets si no existe
CREATE TABLE IF NOT EXISTS public.fixed_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT,
    assetId TEXT,
    name TEXT,
    category TEXT DEFAULT 'Otro',
    purchaseDate TIMESTAMP WITH TIME ZONE,
    purchaseCost DECIMAL(15,2),
    usefulLifeYrs DECIMAL,
    salvageValue DECIMAL(15,2),
    currentValue DECIMAL(15,2),
    depreciationMethod TEXT DEFAULT 'Lineal',
    lastDepreciationDate TIMESTAMP WITH TIME ZONE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS para las nuevas tablas
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para debts
CREATE POLICY "Enable read access for all users" ON public.debts FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.debts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.debts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.debts FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Políticas para fixed_assets
CREATE POLICY "Enable read access for all users" ON public.fixed_assets FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.fixed_assets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.fixed_assets FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.fixed_assets FOR DELETE USING (auth.role() = 'authenticated');
