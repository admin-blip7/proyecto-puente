-- Create inventory_logs table for tracking stock changes
-- This migration creates the missing inventory_logs table

CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    change INTEGER NOT NULL, -- Positive for entries, negative for exits
    reason VARCHAR(255) NOT NULL, -- e.g., "Ingreso de Mercancía", "Venta", "Creación de Producto"
    updated_by VARCHAR(255) NOT NULL, -- User ID who performed the change
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}' -- Additional data like cost, sale_id, etc.
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_updated_by ON inventory_logs(updated_by);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_reason ON inventory_logs(reason);