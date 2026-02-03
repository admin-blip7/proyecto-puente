-- Crear tabla consignor_payments
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.consignor_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE NOT NULL,
    paymentId TEXT NOT NULL UNIQUE,
    consignorId UUID NOT NULL REFERENCES public.consignors(id) ON DELETE CASCADE,
    amountPaid DECIMAL(15,2) NOT NULL CHECK (amountPaid >= 0),
    paymentDate TIMESTAMP WITH TIME ZONE NOT NULL,
    paymentMethod TEXT NOT NULL DEFAULT 'Efectivo',
    proofOfPaymentUrl TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_consignor_payments_consignor_id ON public.consignor_payments(consignorId);
CREATE INDEX IF NOT EXISTS idx_consignor_payments_payment_date ON public.consignor_payments(paymentDate);
CREATE INDEX IF NOT EXISTS idx_consignor_payments_payment_id ON public.consignor_payments(paymentId);

-- Habilitar Row Level Security
ALTER TABLE public.consignor_payments ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS
CREATE POLICY "Enable read access for all users" ON public.consignor_payments FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.consignor_payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.consignor_payments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.consignor_payments FOR DELETE USING (auth.role() = 'authenticated');

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_consignor_payments_updated_at
    BEFORE UPDATE ON public.consignor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();