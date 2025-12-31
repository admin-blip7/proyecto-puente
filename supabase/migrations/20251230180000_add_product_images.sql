-- Create bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Add image_urls column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Allow public access to products bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

-- Allow authenticated users to upload to products bucket
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'products' AND auth.role() = 'authenticated' );

-- Allow authenticated users to update/delete their uploads (optional, but good for management)
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'products' AND auth.role() = 'authenticated' );

CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'products' AND auth.role() = 'authenticated' );
