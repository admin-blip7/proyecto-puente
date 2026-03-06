-- ============================================================================
-- Migration: Add Product Ownership and Audit Trail
-- Created: 2026-02-20
-- Description: Adds created_by, partner_id, branch_id to products table
--              and creates product_audit_logs table for full traceability
-- ============================================================================

-- ----------------------------------------------------------------------
-- 1. Add ownership columns to products table
-- ----------------------------------------------------------------------

-- created_by: User who created the product
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
COMMENT ON COLUMN public.products.created_by IS 'User who created this product';

-- partner_id: Owner partner (NULL for Master Admin products)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id);
COMMENT ON COLUMN public.products.partner_id IS 'Partner who owns this product (NULL for Master Admin)';

-- branch_id: Branch where product was created/managed
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
COMMENT ON COLUMN public.products.branch_id IS 'Branch where this product is managed (for partners)';

-- created_at_branch_id: Branch where product was initially created
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at_branch_id UUID REFERENCES public.branches(id);
COMMENT ON COLUMN public.products.created_at_branch_id IS 'Branch where product was initially created (for history tracking)';

-- ----------------------------------------------------------------------
-- 2. Create indexes for performance
-- ----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_partner_id ON public.products(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_branch_id ON public.products(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at_branch_id ON public.products(created_at_branch_id) WHERE created_at_branch_id IS NOT NULL;

-- ----------------------------------------------------------------------
-- 3. Create product_audit_logs table
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT NOT NULL,

    -- Action performed
    action TEXT NOT NULL CHECK (action IN (
        'created',
        'updated',
        'deleted',
        'price_changed',
        'cost_changed',
        'stock_changed',
        'ownership_transferred'
    )),

    -- User who performed the action
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,

    -- Context
    partner_id UUID REFERENCES public.partners(id),
    branch_id UUID REFERENCES public.branches(id),

    -- Changes made (JSON format: { field: { from: value, to: value } })
    changes JSONB DEFAULT '{}',

    -- Reason for change
    reason TEXT,

    -- IP address for security audit
    ip_address TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.product_audit_logs IS 'Audit trail for all product modifications';
COMMENT ON COLUMN public.product_audit_logs.changes IS 'JSON object tracking before/after values';
COMMENT ON COLUMN public.product_audit_logs.reason IS 'Optional reason for the change';

-- ----------------------------------------------------------------------
-- 4. Create indexes for audit logs
-- ----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_product_audit_product ON public.product_audit_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_audit_user ON public.product_audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_audit_partner ON public.product_audit_logs(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_audit_action ON public.product_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_product_audit_created_at ON public.product_audit_logs(created_at DESC);

-- ----------------------------------------------------------------------
-- 5. Add approval request columns to branch_stock
-- ----------------------------------------------------------------------
ALTER TABLE public.branch_stock ADD COLUMN IF NOT EXISTS store_approval_requested BOOLEAN DEFAULT false;
COMMENT ON COLUMN public.branch_stock.store_approval_requested IS 'True when partner requests store approval';

ALTER TABLE public.branch_stock ADD COLUMN IF NOT EXISTS store_approval_requested_at TIMESTAMP WITH TIME ZONE;
COMMENT ON COLUMN public.branch_stock.store_approval_requested_at IS 'When store approval was requested';

ALTER TABLE public.branch_stock ADD COLUMN IF NOT EXISTS store_approval_notes TEXT;
COMMENT ON COLUMN public.branch_stock.store_approval_notes IS 'Notes from partner when requesting approval';

CREATE INDEX IF NOT EXISTS idx_branch_stock_approval_requested ON public.branch_stock(store_approval_requested)
    WHERE store_approval_requested = true;

-- ----------------------------------------------------------------------
-- 6. Create trigger function to log product changes
-- ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_product_change()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_changes JSONB := '{}';
    v_old_record RECORD;
    v_new_record RECORD;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := jsonb_build_object(
            'product', jsonb_build_object(
                'id', NEW.id,
                'name', NEW.name,
                'sku', NEW.sku,
                'price', NEW.price,
                'cost', NEW.cost,
                'partner_id', NEW.partner_id,
                'branch_id', NEW.branch_id
            )
        );

        INSERT INTO public.product_audit_logs (
            product_id,
            action,
            user_id,
            partner_id,
            branch_id,
            changes
        ) VALUES (
            NEW.id,
            v_action,
            auth.uid(),
            NEW.partner_id,
            NEW.branch_id,
            v_changes
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        v_old_record := OLD;
        v_new_record := NEW;

        -- Build changes object for fields that actually changed
        IF v_old_record.price != v_new_record.price THEN
            v_changes := jsonb_set(v_changes, '{price}', jsonb_build_object(
                'from', v_old_record.price,
                'to', v_new_record.price
            ));
            INSERT INTO public.product_audit_logs (
                product_id, action, user_id, partner_id, branch_id, changes
            ) VALUES (
                NEW.id, 'price_changed', auth.uid(), NEW.partner_id, NEW.branch_id, v_changes
            );
            v_changes := '{}';
        END IF;

        IF v_old_record.cost != v_new_record.cost THEN
            v_changes := jsonb_set(v_changes, '{cost}', jsonb_build_object(
                'from', v_old_record.cost,
                'to', v_new_record.cost
            ));
            INSERT INTO public.product_audit_logs (
                product_id, action, user_id, partner_id, branch_id, changes
            ) VALUES (
                NEW.id, 'cost_changed', auth.uid(), NEW.partner_id, NEW.branch_id, v_changes
            );
            v_changes := '{}';
        END IF;

        IF v_old_record.stock != v_new_record.stock THEN
            v_changes := jsonb_set(v_changes, '{stock}', jsonb_build_object(
                'from', v_old_record.stock,
                'to', v_new_record.stock
            ));
            INSERT INTO public.product_audit_logs (
                product_id, action, user_id, partner_id, branch_id, changes
            ) VALUES (
                NEW.id, 'stock_changed', auth.uid(), NEW.partner_id, NEW.branch_id, v_changes
            );
            v_changes := '{}';
        END IF;

        IF v_old_record.partner_id IS DISTINCT FROM v_new_record.partner_id THEN
            v_changes := jsonb_set(v_changes, '{partner_id}', jsonb_build_object(
                'from', v_old_record.partner_id,
                'to', v_new_record.partner_id
            ));
            INSERT INTO public.product_audit_logs (
                product_id, action, user_id, partner_id, branch_id, changes, reason
            ) VALUES (
                NEW.id, 'ownership_transferred', auth.uid(), v_old_record.partner_id, NEW.branch_id, v_changes,
                'Ownership transferred from ' || COALESCE(v_old_record.partner_id::TEXT, 'Master') || ' to ' || COALESCE(NEW.partner_id::TEXT, 'Master')
            );
        END IF;

        -- Generic update log for other changes
        IF v_old_record.name != v_new_record.name OR
           v_old_record.sku != v_new_record.sku OR
           v_old_record.description IS DISTINCT FROM v_new_record.description THEN
            INSERT INTO public.product_audit_logs (
                product_id, action, user_id, partner_id, branch_id, changes
            ) VALUES (
                NEW.id, 'updated', auth.uid(), NEW.partner_id, NEW.branch_id,
                jsonb_build_object(
                    'name', jsonb_build_object('from', v_old_record.name, 'to', v_new_record.name),
                    'sku', jsonb_build_object('from', v_old_record.sku, 'to', v_new_record.sku)
                )
            );
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.product_audit_logs (
            product_id,
            action,
            user_id,
            partner_id,
            branch_id,
            changes
        ) VALUES (
            OLD.id,
            'deleted',
            auth.uid(),
            OLD.partner_id,
            OLD.branch_id,
            jsonb_build_object('deleted_product', jsonb_build_object(
                'id', OLD.id,
                'name', OLD.name,
                'sku', OLD.sku
            ))
        );

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------
-- 7. Create triggers for automatic audit logging
-- ----------------------------------------------------------------------
DROP TRIGGER IF EXISTS products_audit_trigger ON public.products;
CREATE TRIGGER products_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION log_product_change();

-- ----------------------------------------------------------------------
-- 8. RLS for product_audit_logs
-- ----------------------------------------------------------------------
ALTER TABLE public.product_audit_logs ENABLE ROW LEVEL SECURITY;

-- Everyone can read audit logs
DROP POLICY IF EXISTS "product_audit_logs_select_all" ON public.product_audit_logs;
CREATE POLICY "product_audit_logs_select_all"
    ON public.product_audit_logs FOR SELECT USING (true);

-- Only authenticated users can insert audit logs
DROP POLICY IF EXISTS "product_audit_logs_insert_auth" ON public.product_audit_logs;
CREATE POLICY "product_audit_logs_insert_auth"
    ON public.product_audit_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
