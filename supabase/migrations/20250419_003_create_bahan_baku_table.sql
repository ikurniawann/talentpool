-- Migration: create_bahan_baku_table
-- Raw materials table

CREATE TABLE IF NOT EXISTS bahan_baku (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(200) NOT NULL,
  deskripsi TEXT,
  satuan_id UUID NOT NULL REFERENCES satuan(id) ON DELETE RESTRICT,
  kategori VARCHAR(50),
  harga_estimasi DECIMAL(15, 2),
  minimum_stock DECIMAL(15, 3) DEFAULT 0,
  maximum_stock DECIMAL(15, 3),
  current_stock DECIMAL(15, 3) DEFAULT 0,
  lokasi_rak VARCHAR(100),
  lead_time_days INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bahan_baku_kode ON bahan_baku(kode);
CREATE INDEX idx_bahan_baku_nama ON bahan_baku(nama);
CREATE INDEX idx_bahan_baku_satuan_id ON bahan_baku(satuan_id);
CREATE INDEX idx_bahan_baku_kategori ON bahan_baku(kategori);
CREATE INDEX idx_bahan_baku_is_active ON bahan_baku(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_bahan_baku_updated_at
BEFORE UPDATE ON bahan_baku
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE bahan_baku IS 'Tabel bahan baku';
