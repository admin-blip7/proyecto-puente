-- Add attributes column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS attributes jsonb DEFAULT '{}';

-- Add index for better performance on attributes queries
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON products USING gin (attributes);