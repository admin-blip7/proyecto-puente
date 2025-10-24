-- Create consignor_transactions table to track all payment transactions
CREATE TABLE IF NOT EXISTS consignor_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firestore_id TEXT UNIQUE NOT NULL,
  consignorId UUID NOT NULL,
  consignorName TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  paymentMethod TEXT NOT NULL CHECK (paymentMethod IN ('Transferencia Bancaria', 'Efectivo', 'Dep�sito')),
  notes TEXT,
  previousBalance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (previousBalance >= 0),
  newBalance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (newBalance >= 0),
  transactionType TEXT NOT NULL DEFAULT 'payment' CHECK (transactionType IN ('payment')),
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processedBy TEXT,

  -- Add foreign key relationship to consignors table
  CONSTRAINT fk_consignor
    FOREIGN KEY (consignorId)
    REFERENCES consignors(id)
    ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_consignor_transactions_consignorId ON consignor_transactions(consignorId);
CREATE INDEX idx_consignor_transactions_createdAt ON consignor_transactions(createdAt);
CREATE INDEX idx_consignor_transactions_transactionType ON consignor_transactions(transactionType);

-- Add RLS (Row Level Security) policies
ALTER TABLE consignor_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on consignor_transactions"
ON consignor_transactions
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE consignor_transactions IS 'Tracks all payment transactions made to consignors';
COMMENT ON COLUMN consignor_transactions.firestore_id IS 'Unique identifier for the transaction (UUID v4)';
COMMENT ON COLUMN consignor_transactions.consignorId IS 'References the consignor who made the payment';
COMMENT ON COLUMN consignor_transactions.amount IS 'Payment amount';
COMMENT ON COLUMN consignor_transactions.paymentMethod IS 'Method used for the payment';
COMMENT ON COLUMN consignor_transactions.previousBalance IS 'Balance before the payment';
COMMENT ON COLUMN consignor_transactions.newBalance IS 'Balance after the payment';
COMMENT ON COLUMN consignor_transactions.transactionType IS 'Type of transaction (currently only payment)';