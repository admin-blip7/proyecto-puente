-- Create consignor_payments table
CREATE TABLE IF NOT EXISTS consignor_payments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    firestore_id TEXT UNIQUE NOT NULL,
    paymentId TEXT UNIQUE NOT NULL,
    consignorid UUID NOT NULL REFERENCES consignors(id) ON DELETE CASCADE,
    amountPaid DECIMAL(12, 2) NOT NULL CHECK (amountPaid >= 0),
    paymentDate TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paymentMethod TEXT NOT NULL DEFAULT 'Efectivo',
    proofOfPaymentUrl TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_consignor_payments_consignorid ON consignor_payments(consignorid);
CREATE INDEX idx_consignor_payments_payment_date ON consignor_payments(paymentDate DESC);
CREATE INDEX idx_consignor_payments_firestore_id ON consignor_payments(firestore_id);

-- Add RLS policies
ALTER TABLE consignor_payments ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read payments
CREATE POLICY "Users can view consignor payments" ON consignor_payments
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to insert payments
CREATE POLICY "Users can insert consignor payments" ON consignor_payments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow authenticated users to update payments
CREATE POLICY "Users can update consignor payments" ON consignor_payments
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy to allow authenticated users to delete payments
CREATE POLICY "Users can delete consignor payments" ON consignor_payments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_consignor_payments_updated_at
    BEFORE UPDATE ON consignor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();