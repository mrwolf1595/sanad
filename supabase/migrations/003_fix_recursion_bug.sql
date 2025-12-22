-- Create a secure function to get the current user's organization ID
-- This function runs with security definer to bypass RLS recursion
CREATE OR REPLACE FUNCTION get_auth_user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- Fix users policies
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;

-- Allow users to view their own record and others in their organization
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (
    id = auth.uid() OR 
    organization_id = get_auth_user_organization_id()
  );

-- Allow users to insert their own record (for onboarding)
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow admins to update users in their organization
CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  USING (
    organization_id = get_auth_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete users in their organization
CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  USING (
    organization_id = get_auth_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix organizations policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their own organization" ON organizations;

CREATE POLICY "Authenticated users can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id = get_auth_user_organization_id()
  );

CREATE POLICY "Admins can update their own organization"
  ON organizations FOR UPDATE
  USING (
    id = get_auth_user_organization_id() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix receipts policies
DROP POLICY IF EXISTS "Users can view receipts in their organization" ON receipts;
DROP POLICY IF EXISTS "Users can create receipts in their organization" ON receipts;

CREATE POLICY "Users can view receipts in their organization"
  ON receipts FOR SELECT
  USING (
    organization_id = get_auth_user_organization_id()
  );

CREATE POLICY "Users can create receipts in their organization"
  ON receipts FOR INSERT
  WITH CHECK (
    organization_id = get_auth_user_organization_id()
  );
