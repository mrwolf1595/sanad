-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON users;

-- Allow users to insert their own initial record during onboarding
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow users to view their own record and others in their organization
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (
    id = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow admins to update users in their organization
CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete users in their organization
CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fix organizations policies to avoid recursion
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;

-- Allow users to insert organization during onboarding
CREATE POLICY "Authenticated users can insert organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow admins to update their organization
CREATE POLICY "Admins can update their own organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
