-- Add branch_id and partner_id to products for per-branch inventory tracking
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS branch_id UUID,
  ADD COLUMN IF NOT EXISTS partner_id UUID;

CREATE INDEX IF NOT EXISTS idx_products_branch_id ON public.products(branch_id);
CREATE INDEX IF NOT EXISTS idx_products_partner_id ON public.products(partner_id);
