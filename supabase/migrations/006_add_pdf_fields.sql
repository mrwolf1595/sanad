-- Add new columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS stamp_url TEXT;

-- Add new columns to receipts table
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS national_id_from TEXT,
ADD COLUMN IF NOT EXISTS national_id_to TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS cheque_number TEXT,
ADD COLUMN IF NOT EXISTS transfer_number TEXT,
ADD COLUMN IF NOT EXISTS vat_amount DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0;
