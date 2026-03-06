-- supabase/migrations/20260221000003_fix_missing_branch_stock.sql
-- ============================================================================
-- Fix missing branch_stock records for partner products
-- Description: Inserts branch_stock rows for products that have a partner_id 
--              but lack a corresponding branch_stock record.
-- ============================================================================

DO $$
DECLARE
    v_partner_record RECORD;
    v_branch_id UUID;
    v_product RECORD;
    v_records_inserted INT := 0;
BEGIN
    -- Iterate through all products that have a partner_id but NO branch_stock record
    FOR v_product IN 
        SELECT p.id, p.partner_id, p.stock
        FROM public.products p
        LEFT JOIN public.branch_stock bs ON p.id::TEXT = bs.product_id AND (
            -- join on partner_id via branches
            EXISTS (SELECT 1 FROM public.branches b WHERE b.id = bs.branch_id AND b.partner_id = p.partner_id)
        )
        WHERE p.partner_id IS NOT NULL 
        AND bs.id IS NULL
    LOOP
        -- Find the default branch for this partner (prioritize is_main = true)
        SELECT id INTO v_branch_id
        FROM public.branches
        WHERE partner_id = v_product.partner_id
        ORDER BY is_main DESC, created_at ASC
        LIMIT 1;

        -- If a branch is found, insert the missing branch_stock
        IF v_branch_id IS NOT NULL THEN
            INSERT INTO public.branch_stock (branch_id, product_id, quantity, reserved, last_stock_update)
            VALUES (v_branch_id, v_product.id::TEXT, v_product.stock, 0, NOW())
            ON CONFLICT (branch_id, product_id) DO UPDATE 
            SET quantity = EXCLUDED.quantity, last_stock_update = NOW();
            
            v_records_inserted := v_records_inserted + 1;
        ELSE
            RAISE NOTICE 'Partner % has no branches. Cannot assign stock for product %.', v_product.partner_id, v_product.id;
        END IF;

    END LOOP;
    
    RAISE NOTICE 'Inserted % missing branch_stock records.', v_records_inserted;
END $$;
