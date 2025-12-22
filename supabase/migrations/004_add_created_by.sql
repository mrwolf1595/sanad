-- Add created_by column to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update INSERT policy to ensure created_by is set to the current user
DROP POLICY IF EXISTS "Authenticated users can insert organizations" ON organizations;

CREATE POLICY "Users can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

-- Update SELECT policy to allow users to view organizations they created
-- This is crucial for the onboarding flow where the user creates an org 
-- but isn't linked to it in the users table yet
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id = get_auth_user_organization_id() OR
    created_by = auth.uid()
  );

-- Update UPDATE policy to allow admins to update their organization
-- We keep the admin check for updates, but also allow the creator if needed (optional)
-- For now, let's stick to the admin role check which is more robust for multi-user orgs
DROP POLICY IF EXISTS "Admins can update their own organization" ON organizations;

CREATE POLICY "Admins can update their own organization"
  ON organizations FOR UPDATE
  USING (
    id = get_auth_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
