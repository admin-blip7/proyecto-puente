-- Fix inventory_logs table structure
ALTER TABLE inventory_logs
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS product_id uuid,
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS change integer,
ADD COLUMN IF NOT EXISTS reason text,
ADD COLUMN IF NOT EXISTS updated_by uuid,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_updated_by ON inventory_logs(updated_by);