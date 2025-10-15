-- Add missing columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS combo_product_ids text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS compatibility_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS search_keywords text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS consignor_id uuid references consignors(id),
ADD COLUMN IF NOT EXISTS reorder_point integer DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_consignor_id ON products(consignor_id);
CREATE INDEX IF NOT EXISTS idx_products_combo_product_ids ON products USING gin(combo_product_ids);
CREATE INDEX IF NOT EXISTS idx_products_compatibility_tags ON products USING gin(compatibility_tags);
CREATE INDEX IF NOT EXISTS idx_products_search_keywords ON products USING gin(search_keywords);