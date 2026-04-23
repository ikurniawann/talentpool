-- ============================================
-- CREATE: Supplier Price List Table
-- Date: 2025-04-23
-- Description: Link suppliers to raw materials with pricing
-- ============================================

-- Drop existing table if exists (for clean slate)
DROP TABLE IF EXISTS supplier_price_lists CASCADE;

-- Create supplier_price_lists table
CREATE TABLE supplier_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  bahan_baku_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  harga DECIMAL(15,2) NOT NULL CHECK (harga >= 0),
  satuan_id UUID REFERENCES units(id),
  minimum_qty DECIMAL(15,4) NOT NULL DEFAULT 1 CHECK (minimum_qty > 0),
  lead_time_days INTEGER NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  berlaku_dari DATE NOT NULL DEFAULT CURRENT_DATE,
  berlaku_sampai DATE,
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint: one price per supplier per material (active only)
  UNIQUE NULLS NOT DISTINCT (supplier_id, bahan_baku_id)
);

-- Indexes for performance
CREATE INDEX idx_supplier_price_list_supplier ON supplier_price_lists(supplier_id);
CREATE INDEX idx_supplier_price_list_bahan_baku ON supplier_price_lists(bahan_baku_id);
CREATE INDEX idx_supplier_price_list_preferred ON supplier_price_lists(is_preferred) WHERE is_preferred = TRUE AND is_active = TRUE;
CREATE INDEX idx_supplier_price_list_validity ON supplier_price_lists(berlaku_dari, berlaku_sampai);
CREATE INDEX idx_supplier_price_list_active ON supplier_price_lists(is_active) WHERE is_active = TRUE;

-- Comment
COMMENT ON TABLE supplier_price_lists IS 'Harga bahan baku per supplier dengan validity period';
COMMENT ON COLUMN supplier_price_lists.harga IS 'Harga per unit dalam currency supplier';
COMMENT ON COLUMN supplier_price_lists.minimum_qty IS 'Minimum order quantity (MOQ)';
COMMENT ON COLUMN supplier_price_lists.lead_time_days IS 'Estimasi hari dari order sampai barang datang';
COMMENT ON COLUMN supplier_price_lists.is_preferred IS 'Flag untuk preferred supplier (harga prioritas)';
COMMENT ON COLUMN supplier_price_lists.berlaku_dari IS 'Tanggal harga mulai berlaku';
COMMENT ON COLUMN supplier_price_lists.berlaku_sampai IS 'Tanggal harga berlaku sampai (NULL = tanpa batas)';
COMMENT ON COLUMN supplier_price_lists.catatan IS 'Catatan tambahan (syarat pembayaran, kondisi khusus, dll)';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplier_price_lists_updated_at
  BEFORE UPDATE ON supplier_price_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View for easy querying
DROP VIEW IF EXISTS v_supplier_price_lists CASCADE;
CREATE VIEW v_supplier_price_lists AS
SELECT 
  spl.id,
  spl.supplier_id,
  spl.bahan_baku_id,
  spl.harga,
  spl.satuan_id,
  spl.minimum_qty,
  spl.lead_time_days,
  spl.is_preferred,
  spl.is_active,
  spl.berlaku_dari,
  spl.berlaku_sampai,
  spl.catatan,
  spl.created_at,
  spl.updated_at,
  spl.created_by,
  spl.updated_by,
  s.kode as supplier_kode,
  s.nama_supplier,
  s.payment_terms as supplier_payment_terms,
  s.currency as supplier_currency,
  rb.kode as bahan_baku_kode,
  rb.nama as bahan_baku_nama,
  rb.kategori as bahan_baku_kategori,
  u.kode as satuan_kode,
  u.nama as satuan_nama
FROM supplier_price_lists spl
LEFT JOIN suppliers s ON spl.supplier_id = s.id
LEFT JOIN raw_materials rb ON spl.bahan_baku_id = rb.id
LEFT JOIN units u ON spl.satuan_id = u.id
WHERE spl.deleted_at IS NULL AND spl.is_active = TRUE;

COMMENT ON VIEW v_supplier_price_lists IS 'View supplier price lists dengan supplier & bahan baku info';
