-- Create storage bucket for cash session tickets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cash-session-tickets', 'cash-session-tickets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload tickets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cash-session-tickets');

-- Allow authenticated users to read tickets
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read tickets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cash-session-tickets');

-- Allow public read access to tickets (since we're using public URLs)
CREATE POLICY IF NOT EXISTS "Allow public read access to tickets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'cash-session-tickets');

-- Allow authenticated users to update tickets (for re-generating)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update tickets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'cash-session-tickets');

-- Allow authenticated users to delete tickets
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete tickets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cash-session-tickets');
