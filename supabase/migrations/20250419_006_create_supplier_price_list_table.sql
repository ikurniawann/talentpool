-- Migration: create_supplier_price_list_table
-- Supplier price list for raw materials

CREATE TABLE IF NOT EXISTS supplier_price_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  bahan_baku_id UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE CASCADE,
  harga DECIMAL(15, 2) NOT NULL,
  satuan_id UUID NOT NULL REFERENCES satuan(id) ON DELETE RESTRICT,
  minimum_qty DECIMAL(15, 3) DEFAULT 1,
  lead_time_days INTEGER DEFAULT 0,
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  berlaku_dari DATE NOT NULL DEFAULT CURRENT_DATE,
  berlaku_sampai DATE,
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, bahan_baku_id)
);

-- Indexes
CREATE INDEX idx_spl_supplier_id ON supplier_price_lists(supplier_id);
CREATE INDEX idx_spl_bahan_baku_id ON supplier_price_lists(bahan_baku_id);
CREATE INDEX idx_spl_is_preferred ON supplier_price_lists(is_preferred);
CREATE INDEX idx_spl_is_active ON supplier_price_lists(is_active);
CREATE INDEX idx_spl_berlaku ON supplier_price_lists(berlaku_dari, berlaku_sampai);

-- Trigger for updated_at
CREATE TRIGGER update_spl_updated_at
BEFORE UPDATE ON supplier_price_lists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE supplier_price_lists IS 'Tabel daftar harga supplier untuk bahan baku';
