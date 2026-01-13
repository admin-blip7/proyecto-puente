-- Migration: Add discount support to sales table
-- Date: 2025-01-11

-- Add discount-related columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2);

-- Add comment for documentation
COMMENT ON COLUMN sales.discount_code IS 'The discount code applied to this sale';
COMMENT ON COLUMN sales.discount_amount IS 'The total discount amount in currency';
COMMENT ON COLUMN sales.discount_percentage IS 'The discount percentage applied';

-- Create index for discount code lookups (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_sales_discount_code ON sales(discount_code) WHERE discount_code IS NOT NULL;
