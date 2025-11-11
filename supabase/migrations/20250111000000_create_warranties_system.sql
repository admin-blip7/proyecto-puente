-- Crear tabla de garantías
CREATE TABLE IF NOT EXISTS warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    warranty_folio TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    product_id UUID NOT NULL REFERENCES products(id),
    original_quantity INTEGER NOT NULL DEFAULT 1,
    original_price DECIMAL(10, 2) NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('damaged', 'defective', 'wrong_product', 'other')),
    description TEXT,
    evidence_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    notes TEXT
);

-- Crear tabla de cambios de productos
CREATE TABLE IF NOT EXISTS product_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
    new_product_id UUID NOT NULL REFERENCES products(id),
    new_quantity INTEGER NOT NULL DEFAULT 1,
    new_product_price DECIMAL(10, 2) NOT NULL,
    price_difference DECIMAL(10, 2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'credit', 'none')),
    exchange_status TEXT NOT NULL DEFAULT 'pending' CHECK (exchange_status IN ('pending', 'completed', 'cancelled')),
    new_sale_id UUID REFERENCES sales(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Modificar tabla sales para agregar campos de garantía
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_exchange_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_sale_id UUID REFERENCES sales(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS warranty_folio TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES product_exchanges(id);

-- Crear tabla de productos defectuosos (inventario de dañados)
CREATE TABLE IF NOT EXISTS damaged_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    warranty_id UUID REFERENCES warranties(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'damaged' CHECK (status IN ('damaged', 'returned_to_inventory', 'discarded', 'sent_to_manufacturer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_warranties_status ON warranties(status);
CREATE INDEX IF NOT EXISTS idx_warranties_created_at ON warranties(created_at);
CREATE INDEX IF NOT EXISTS idx_warranties_original_sale ON warranties(original_sale_id);
CREATE INDEX IF NOT EXISTS idx_warranties_folio ON warranties(warranty_folio);
CREATE INDEX IF NOT EXISTS idx_product_exchanges_warranty ON product_exchanges(warranty_id);
CREATE INDEX IF NOT EXISTS idx_product_exchanges_status ON product_exchanges(exchange_status);
CREATE INDEX IF NOT EXISTS idx_sales_warranty_folio ON sales(warranty_folio);
CREATE INDEX IF NOT EXISTS idx_sales_is_exchange ON sales(is_exchange_sale);
CREATE INDEX IF NOT EXISTS idx_damaged_products_status ON damaged_products(status);

-- Crear función para generar folio de garantía
CREATE OR REPLACE FUNCTION generate_warranty_folio()
RETURNS TEXT AS $$
DECLARE
    new_folio TEXT;
    folio_number INTEGER;
BEGIN
    -- Obtener el último número de folio del año actual
    SELECT COALESCE(MAX(CAST(SUBSTRING(warranty_folio FROM 'GAR-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
    INTO folio_number
    FROM warranties
    WHERE warranty_folio LIKE 'GAR-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%';
    
    -- Generar el nuevo folio con formato GAR-YYYY-NNNNNN
    new_folio := 'GAR-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(folio_number::TEXT, 6, '0');
    
    RETURN new_folio;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para asignar folio automáticamente
CREATE OR REPLACE FUNCTION set_warranty_folio()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.warranty_folio IS NULL OR NEW.warranty_folio = '' THEN
        NEW.warranty_folio := generate_warranty_folio();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_warranty_folio
    BEFORE INSERT ON warranties
    FOR EACH ROW
    EXECUTE FUNCTION set_warranty_folio();

-- Crear vista para estadísticas de garantías
CREATE OR REPLACE VIEW warranty_statistics AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.category,
    COUNT(w.id) as warranty_count,
    COUNT(CASE WHEN w.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN w.status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(CASE WHEN w.status = 'pending' THEN 1 END) as pending_count,
    SUM(w.original_price * w.original_quantity) as total_warranty_value,
    AVG(EXTRACT(EPOCH FROM (w.resolved_at - w.created_at))/3600) as avg_resolution_hours
FROM products p
LEFT JOIN warranties w ON p.id = w.product_id
GROUP BY p.id, p.name, p.category;

-- Crear políticas RLS (Row Level Security)
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE damaged_products ENABLE ROW LEVEL SECURITY;

-- Política para warranties (todos los usuarios autenticados pueden ver)
CREATE POLICY "Users can view warranties" ON warranties
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para crear warranties (usuarios autenticados)
CREATE POLICY "Users can create warranties" ON warranties
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política para actualizar warranties (solo creador o admin)
CREATE POLICY "Users can update own warranties" ON warranties
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Políticas similares para product_exchanges
CREATE POLICY "Users can view exchanges" ON product_exchanges
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create exchanges" ON product_exchanges
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update exchanges" ON product_exchanges
    FOR UPDATE
    TO authenticated
    USING (true);

-- Políticas para damaged_products
CREATE POLICY "Users can view damaged products" ON damaged_products
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can manage damaged products" ON damaged_products
    FOR ALL
    TO authenticated
    USING (true);

-- Crear función para calcular diferencia de precio
CREATE OR REPLACE FUNCTION calculate_price_difference(
    p_original_price DECIMAL,
    p_original_quantity INTEGER,
    p_new_price DECIMAL,
    p_new_quantity INTEGER
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN (p_new_price * p_new_quantity) - (p_original_price * p_original_quantity);
END;
$$ LANGUAGE plpgsql;

-- Comentarios en las tablas
COMMENT ON TABLE warranties IS 'Tabla para gestionar garantías de productos';
COMMENT ON TABLE product_exchanges IS 'Tabla para registrar cambios de productos por garantía';
COMMENT ON TABLE damaged_products IS 'Inventario de productos dañados o defectuosos';
COMMENT ON COLUMN warranties.warranty_folio IS 'Folio único de garantía (GAR-YYYY-NNNNNN)';
COMMENT ON COLUMN warranties.reason IS 'Motivo: damaged, defective, wrong_product, other';
COMMENT ON COLUMN warranties.status IS 'Estado: pending, approved, completed, rejected';
COMMENT ON COLUMN product_exchanges.price_difference IS 'Diferencia de precio (positivo=cobrar, negativo=devolver)';
