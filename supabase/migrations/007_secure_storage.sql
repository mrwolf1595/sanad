-- Make receipts bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'receipts';

-- Function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- Drop existing policies for receipts
DROP POLICY IF EXISTS "Public Access Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their org receipts 1lnm9mj_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload receipts 1lnm9mj_0" ON storage.objects;

-- Create new secure policies
-- Allow users to view files in their organization's folder
CREATE POLICY "View Org Receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = public.get_user_org_id()::text
);

-- Allow users to upload files to their organization's folder
CREATE POLICY "Upload Org Receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = public.get_user_org_id()::text
);

-- Allow users to update/delete files in their organization's folder
CREATE POLICY "Manage Org Receipts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = public.get_user_org_id()::text
);

CREATE POLICY "Delete Org Receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[1] = public.get_user_org_id()::text
);
