-- Create the table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Create policies (Adjust based on your auth needs - assuming public read, auth write for now)
CREATE POLICY "Allow public read access" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON product_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON product_categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON product_categories FOR DELETE USING (auth.role() = 'authenticated');

-- Insert initial categories
INSERT INTO product_categories (value, label) VALUES 
('celular-seminuevo', 'Celular Seminuevo'),
('mica', 'Mica Protectora')
ON CONFLICT (value) DO NOTHING;
