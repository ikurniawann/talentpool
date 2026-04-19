-- Migration: create_produk_table
-- Finished products table

CREATE TABLE IF NOT EXISTS produk (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(200) NOT NULL,
  deskripsi TEXT,
  satuan_id UUID NOT NULL REFERENCES satuan(id) ON DELETE RESTRICT,
  kategori VARCHAR(50),
  harga_jual DECIMAL(15, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_produk_kode ON produk(kode);
CREATE INDEX idx_produk_nama ON produk(nama);
CREATE INDEX idx_produk_satuan_id ON produk(satuan_id);
CREATE INDEX idx_produk_kategori ON produk(kategori);
CREATE INDEX idx_produk_is_active ON produk(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_produk_updated_at
BEFORE UPDATE ON produk
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE produk IS 'Tabel produk jadi';
