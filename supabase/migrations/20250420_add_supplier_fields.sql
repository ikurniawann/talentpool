-- ============================================================
-- Migration: Add Extended Supplier Fields
-- Adds: pic_name, pic_phone, kota, payment_terms, currency,
-- deleted_at, deleted_by to suppliers table
-- NOTE: suppliers table is the PRIMARY table for Purchasing module
-- (vendors table also exists but suppliers is used per spec)
-- ============================================================

-- Add new columns to suppliers table
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS pic_name TEXT,
  ADD COLUMN IF NOT EXISTS pic_phone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS kota VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(30) DEFAULT 'NET 30',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'IDR',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Rename existing 'nama' column to 'nama_supplier' if not already renamed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'nama' AND table_schema = 'public') THEN
    ALTER TABLE suppliers RENAME COLUMN nama TO nama_supplier;
  END IF;
END $$;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_suppliers_kota ON suppliers(kota);
CREATE INDEX IF NOT EXISTS idx_suppliers_payment_terms ON suppliers(payment_terms);
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON suppliers(deleted_at);

-- Update existing index on nama_supplier (was likely on 'nama')
DROP INDEX IF EXISTS idx_suppliers_nama;
CREATE INDEX IF NOT EXISTS idx_suppliers_nama_supplier ON suppliers(nama_supplier);

-- Add comments
COMMENT ON COLUMN suppliers.pic_name IS 'Nama PIC supplier';
COMMENT ON COLUMN suppliers.pic_phone IS 'Telepon PIC supplier';
COMMENT ON COLUMN suppliers.kota IS 'Kota supplier';
COMMENT ON COLUMN suppliers.payment_terms IS 'Terms pembayaran: COD, NET7, NET14, NET30, NET45, NET60';
COMMENT ON COLUMN suppliers.currency IS 'Mata uang: IDR, USD, EUR';
COMMENT ON COLUMN suppliers.deleted_at IS 'Soft delete timestamp';
COMMENT ON COLUMN suppliers.deleted_by IS 'User who performed soft delete';
