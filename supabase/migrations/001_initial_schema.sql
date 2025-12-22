-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company', 'establishment', 'office', 'other')),
  commercial_registration TEXT,
  tax_number TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'accountant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL,
  receipt_type TEXT NOT NULL CHECK (receipt_type IN ('receipt', 'payment')),
  amount DECIMAL(15,2) NOT NULL,
  recipient_name TEXT NOT NULL,
  description TEXT,
  payment_method TEXT CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
  date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pdf_url TEXT,
  UNIQUE(organization_id, receipt_number)
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for organizations
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own organization"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policies for users
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can insert users in their organization"
  ON users FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create policies for receipts
CREATE POLICY "Users can view receipts in their organization"
  ON receipts FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create receipts in their organization"
  ON receipts FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update receipts in their organization"
  ON receipts FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can delete receipts in their organization"
  ON receipts FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create function to auto-generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number(org_id UUID, receipt_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  next_number INTEGER;
  prefix TEXT;
BEGIN
  -- Set prefix based on receipt type
  prefix := CASE receipt_type
    WHEN 'receipt' THEN 'REC'
    WHEN 'payment' THEN 'PAY'
    ELSE 'DOC'
  END;

  -- Get next number for this organization
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.receipts
  WHERE organization_id = org_id
    AND receipt_number LIKE prefix || '%';

  RETURN prefix || '-' || TO_CHAR(next_number, 'FM00000');
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_receipts_organization_id ON receipts(organization_id);
CREATE INDEX idx_receipts_date ON receipts(date);
CREATE INDEX idx_users_organization_id ON users(organization_id);
