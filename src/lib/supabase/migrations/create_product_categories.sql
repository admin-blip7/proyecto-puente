-- Create the table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  parent TEXT DEFAULT NULL,
  type TEXT DEFAULT 'category',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create policies (Adjust based on your auth needs - assuming public read, auth write for now)
CREATE POLICY "Allow public read access" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON product_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON product_categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON product_categories FOR DELETE USING (auth.role() = 'authenticated');

-- Insert main categories and subcategories
INSERT INTO product_categories (value, label, parent, type, sort_order) VALUES 
-- Main categories
('accesorios', 'Accesorios', NULL, 'main', 1),
('celulares', 'Celulares', NULL, 'main', 2),
('audio', 'Audio', NULL, 'main', 3),
('wearables', 'Wearables', NULL, 'main', 4),
('camaras', 'Cámaras', NULL, 'main', 5),

-- Subcategories for Accesorios
('audifonos', 'Audífonos', 'accesorios', 'subcategory', 11),
('cargadores', 'Cargadores', 'accesorios', 'subcategory', 12),
('cables', 'Cables', 'accesorios', 'subcategory', 13),
('fundas', 'Fundas', 'accesorios', 'subcategory', 14),
('telefonos-fijos', 'Teléfonos Fijos', 'accesorios', 'subcategory', 15),

-- Subcategories for Celulares
('celulares-nuevos', 'Celulares Nuevos', 'celulares', 'subcategory', 21),
('celulares-seminuevos', 'Celulares Seminuevos', 'celulares', 'subcategory', 22),

-- Subcategories for Audio
('audifonos-bluetooth', 'Audífonos Bluetooth', 'audio', 'subcategory', 31),
('bocinas', 'Bocinas', 'audio', 'subcategory', 32),

-- Subcategories for Wearables
('smartwatch', 'Smartwatch', 'wearables', 'subcategory', 41),
('smartband', 'Smartband', 'wearables', 'subcategory', 42),

-- Subcategories for Cámaras
('camaras-digitales', 'Cámaras Digitales', 'camaras', 'subcategory', 51),
('camaras-accion', 'Cámaras de Acción', 'camaras', 'subcategory', 52)
ON CONFLICT (value) DO NOTHING;
