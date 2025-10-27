-- Add cancellation support to sales table
-- This migration adds columns for tracking sale cancellations and creates a stored procedure
-- to handle the transactional cancellation logic

-- Add cancellation columns to sales table
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- Reconcile inventory_logs to support both sale creation and cancellation
-- Add missing columns if they don't exist
ALTER TABLE public.inventory_logs
ADD COLUMN IF NOT EXISTS change_type TEXT,
ADD COLUMN IF NOT EXISTS quantity_change INTEGER,
ADD COLUMN IF NOT EXISTS previous_stock INTEGER,
ADD COLUMN IF NOT EXISTS new_stock INTEGER,
ADD COLUMN IF NOT EXISTS reference_id TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for inventory_logs
CREATE INDEX IF NOT EXISTS idx_inventory_logs_change_type ON public.inventory_logs(change_type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_reference_id ON public.inventory_logs(reference_id);

-- Create stored procedure for cancelling sales
CREATE OR REPLACE FUNCTION public.cancel_sales(
    p_sale_ids TEXT[],
    p_user_id UUID,
    p_user_name TEXT,
    p_cancel_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    sale_id TEXT,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_sale_id TEXT;
    v_sale_record RECORD;
    v_item JSONB;
    v_product RECORD;
    v_consignor_record RECORD;
    v_product_cost DECIMAL;
    v_quantity INTEGER;
    v_consignor_cost DECIMAL;
    v_current_balance DECIMAL;
    v_new_balance DECIMAL;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Process each sale ID
    FOREACH v_sale_id IN ARRAY p_sale_ids
    LOOP
        BEGIN
            -- Check if sale exists and is not already cancelled
            SELECT * INTO v_sale_record
            FROM public.sales
            WHERE "saleId" = v_sale_id OR saleid = v_sale_id
            LIMIT 1;

            IF NOT FOUND THEN
                RETURN QUERY SELECT v_sale_id, FALSE, 'Sale not found';
                CONTINUE;
            END IF;

            IF v_sale_record.status = 'cancelled' THEN
                RETURN QUERY SELECT v_sale_id, FALSE, 'Sale already cancelled';
                CONTINUE;
            END IF;

            -- Process each item in the sale to restore inventory
            FOR v_item IN SELECT * FROM jsonb_array_elements(v_sale_record.items)
            LOOP
                v_quantity := (v_item->>'quantity')::INTEGER;
                
                -- Get product information using firestore_id
                SELECT id, firestore_id, name, stock, cost, consignor_id 
                INTO v_product
                FROM public.products
                WHERE firestore_id = v_item->>'productId'
                LIMIT 1;

                IF FOUND THEN
                    -- Update product stock (restore quantity)
                    UPDATE public.products
                    SET 
                        stock = stock + v_quantity,
                        updated_at = v_now
                    WHERE id = v_product.id;

                    -- Insert inventory log entry for cancellation
                    INSERT INTO public.inventory_logs (
                        product_id,
                        product_name,
                        change,
                        reason,
                        updated_by,
                        created_at,
                        metadata,
                        change_type,
                        quantity_change,
                        previous_stock,
                        new_stock,
                        reference_id,
                        notes
                    ) VALUES (
                        v_product.firestore_id,
                        v_product.name,
                        v_quantity,
                        'Cancelación de Venta',
                        p_user_id,
                        v_now,
                        jsonb_build_object(
                            'saleId', v_sale_id,
                            'cancelReason', COALESCE(p_cancel_reason, 'No especificado'),
                            'cancelledBy', p_user_name
                        ),
                        'cancellation',
                        v_quantity,
                        v_product.stock,
                        v_product.stock + v_quantity,
                        v_sale_id,
                        format('Cancelación de Venta: %s x%s', v_product.name, v_quantity)
                    );

                    -- If product has a consignor, reverse the balance addition
                    IF v_product.consignor_id IS NOT NULL THEN
                        v_product_cost := COALESCE(v_product.cost, 0);
                        v_consignor_cost := v_product_cost * v_quantity;

                        -- Get current consignor balance
                        SELECT "balanceDue" INTO v_current_balance
                        FROM public.consignors
                        WHERE id = v_product.consignor_id;

                        IF FOUND THEN
                            v_new_balance := COALESCE(v_current_balance, 0) - v_consignor_cost;

                            -- Update consignor balance
                            UPDATE public.consignors
                            SET 
                                "balanceDue" = v_new_balance,
                                updated_at = v_now
                            WHERE id = v_product.consignor_id;
                        END IF;
                    END IF;
                END IF;
            END LOOP;

            -- Mark the sale as cancelled
            UPDATE public.sales
            SET
                status = 'cancelled',
                cancelled_at = v_now,
                cancelled_by = p_user_id,
                cancel_reason = p_cancel_reason,
                updated_at = v_now
            WHERE id = v_sale_record.id;

            -- Return success for this sale
            RETURN QUERY SELECT v_sale_id, TRUE, NULL::TEXT;

        EXCEPTION WHEN OTHERS THEN
            -- Return error for this sale without rolling back other sales
            RETURN QUERY SELECT v_sale_id, FALSE, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.cancel_sales TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sales TO service_role;
