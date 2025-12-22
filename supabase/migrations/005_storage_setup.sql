-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;

-- Create policies for 'logos' bucket
CREATE POLICY "Public Access Logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos' );

CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND
  auth.role() = 'authenticated'
);

-- Create policies for 'receipts' bucket
CREATE POLICY "Public Access Receipts"
ON storage.objects FOR SELECT
USING ( bucket_id = 'receipts' );

CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.role() = 'authenticated'
);
