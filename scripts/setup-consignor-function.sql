-- Create RPC function to get consignor sales
-- Run this after database is fully set up

CREATE OR REPLACE FUNCTION get_consignor_sales(consignor_id_param TEXT)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    total DECIMAL,
    payment_method TEXT,
    items JSONB,
    total_quantity INTEGER,
    client_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.created_at,
        COALESCE(s.total, s.totalAmount, 0) as total,
        COALESCE(s.payment_method, s.paymentMethod, 'Efectivo') as payment_method,
        COALESCE(s.items, '[]'::jsonb) as items,
        -- Calculate total quantity from items
        (
            SELECT COALESCE(SUM((item->>'quantity')::integer), 0)
            FROM jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) as item
        ) as total_quantity,
        -- Get client name
        COALESCE(c.name, s.customer_name, s.customerName, 'Cliente General') as client_name
    FROM public.sales s
    LEFT JOIN public.clients c ON s.client_id = c.id
    ORDER BY s.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_consignor_sales TO authenticated;
GRANT EXECUTE ON FUNCTION get_consignor_sales TO anon;