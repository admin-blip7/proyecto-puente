-- Fix database issues for consignment system

-- 1. Add missing columns to consignors table
ALTER TABLE public.consignors
ADD COLUMN IF NOT EXISTS contactInfo TEXT;

-- Update existing data to populate contactInfo from contact_info if it exists
UPDATE public.consignors
SET contactInfo = contact_info
WHERE contactInfo IS NULL AND contact_info IS NOT NULL;

-- 2. Create the missing get_consignor function
CREATE OR REPLACE FUNCTION get_consignor(consignor_id_param TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    contactinfo TEXT,
    contactInfo TEXT,
    balance_due DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.contact_info as contactinfo,
        c.contactInfo,
        c.balance_due,
        c.created_at
    FROM public.consignors c
    WHERE
        c.id::text = consignor_id_param
        OR c.firestore_id = consignor_id_param;
END;
$$;

-- 3. Create the get_consignor_sales function
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
GRANT EXECUTE ON FUNCTION get_consignor TO authenticated;
GRANT EXECUTE ON FUNCTION get_consignor TO anon;
GRANT EXECUTE ON FUNCTION get_consignor_sales TO authenticated;
GRANT EXECUTE ON FUNCTION get_consignor_sales TO anon;

-- 4. Insert sample consignor if not exists
INSERT INTO public.consignors (id, name, contactInfo, balance_due)
VALUES ('6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb', 'Tecnología Del Itsmo', 'Carlos Tecnologia del Itsmo', 0)
ON CONFLICT (id) DO NOTHING;

-- 5. Insert sample sales for this consignor
INSERT INTO public.sales (id, items, total, payment_method, customer_name, created_at)
VALUES
    ('sale-001',
     '[{"productId": "prod-001", "productName": "Samsung Galaxy A54", "quantity": 2, "priceAtSale": 1200000, "consignorId": "6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb"}]',
     2400000,
     'Efectivo',
     'Juan Pérez',
     NOW() - INTERVAL '2 days'
    ),
    ('sale-002',
     '[{"productId": "prod-002", "productName": "iPhone 13", "quantity": 1, "priceAtSale": 2800000, "consignorId": "6400f9c4-e8ef-4f1a-8fa4-ad93c63161cb"}]',
     2800000,
     'Transferencia',
     'María García',
     NOW() - INTERVAL '1 day'
    )
ON CONFLICT DO NOTHING;