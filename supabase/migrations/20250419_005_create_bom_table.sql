-- Migration: create_bom_table (Bill of Materials)
-- Product composition table

CREATE TABLE IF NOT EXISTS bom (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produk_id UUID NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
  bahan_baku_id UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE RESTRICT,
  jumlah DECIMAL(15, 6) NOT NULL,
  satuan_id UUID NOT NULL REFERENCES satuan(id) ON DELETE RESTRICT,
  waste_percentage DECIMAL(5, 2) DEFAULT 0,
  urutan INTEGER DEFAULT 0,
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(produk_id, bahan_baku_id)
);

-- Indexes
CREATE INDEX idx_bom_produk_id ON bom(produk_id);
CREATE INDEX idx_bom_bahan_baku_id ON bom(bahan_baku_id);
CREATE INDEX idx_bom_is_active ON bom(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_bom_updated_at
BEFORE UPDATE ON bom
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bom IS 'Tabel Bill of Materials (komposisi produk)';
