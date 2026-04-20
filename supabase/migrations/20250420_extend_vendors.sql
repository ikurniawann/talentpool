-- ============================================================
-- Migration: Extend vendors table with full supplier fields
-- Adds: pic_name, pic_phone, kota, payment_terms, currency,
-- deleted_at, deleted_by + rename contact_person -> pic_name
-- ============================================================

-- Rename existing columns to match spec
ALTER TABLE vendors RENAME COLUMN contact_person TO pic_name;
ALTER TABLE vendors RENAME COLUMN phone TO pic_phone;
ALTER TABLE vendors RENAME COLUMN address TO alamat;
ALTER TABLE vendors RENAME COLUMN name TO nama_supplier;

-- Add new columns
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS kota VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(30) DEFAULT 'NET 30',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS email VARCHAR(100),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vendors_kota ON vendors(kota);
CREATE INDEX IF NOT EXISTS idx_vendors_payment_terms ON vendors(payment_terms);
CREATE INDEX IF NOT EXISTS idx_vendors_deleted_at ON vendors(deleted_at);
