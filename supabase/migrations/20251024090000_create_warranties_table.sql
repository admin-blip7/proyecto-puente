-- Create warranties table for warranty tracking

CREATE TABLE IF NOT EXISTS warranties (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    firestore_id TEXT UNIQUE NOT NULL,
    sale_id TEXT,
    product_id TEXT,
    product_name TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Resuelta', 'Rechazada')),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolution_details TEXT,
    resolved_at TIMESTAMPTZ,
    image_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_warranties_customer_phone ON warranties(customer_phone);
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);
CREATE INDEX IF NOT EXISTS idx_warranties_reported_at ON warranties(reported_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER warranties_update_updated_at BEFORE UPDATE ON warranties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
