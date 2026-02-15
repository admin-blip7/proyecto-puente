-- Add parent_id to products table for Product Variations support
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.products(id);

-- Add index for performance when fetching variants
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON public.products(parent_id);

-- Update RLS policies to allow reading variants (if needed, usually public read is already on)
-- Assuming existing policies cover this, but good to verify.
