-- Drop the restrictive policies created in the previous step
DROP POLICY IF EXISTS "View Org Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Manage Org Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Delete Org Receipts" ON storage.objects;

-- Re-create policies with support for legacy files (files at root)
-- This allows access if the file is in the org folder OR if it's linked to an org receipt

CREATE POLICY "View Org Receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts'
  AND (
    -- Option 1: File is in the organization's folder (New structure)
    (storage.foldername(name))[1] = public.get_user_org_id()::text
    OR
    -- Option 2: File is linked to a receipt belonging to the user's organization (Legacy structure)
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.organization_id = public.get_user_org_id()
      AND r.pdf_url LIKE '%' || name
    )
  )
);

CREATE POLICY "Manage Org Receipts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = public.get_user_org_id()::text
    OR
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.organization_id = public.get_user_org_id()
      AND r.pdf_url LIKE '%' || name
    )
  )
);

CREATE POLICY "Delete Org Receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts'
  AND (
    (storage.foldername(name))[1] = public.get_user_org_id()::text
    OR
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.organization_id = public.get_user_org_id()
      AND r.pdf_url LIKE '%' || name
    )
  )
);
