-- Migration: create_inventory_table
-- Current inventory/stock table

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bahan_baku_id UUID NOT NULL UNIQUE REFERENCES bahan_baku(id) ON DELETE CASCADE,
  jumlah_tersedia DECIMAL(15, 3) NOT NULL DEFAULT 0,
  jumlah_dipesan DECIMAL(15, 3) NOT NULL DEFAULT 0,
  jumlah_dipesan_keluar DECIMAL(15, 3) NOT NULL DEFAULT 0,
  jumlah_minimum DECIMAL(15, 3) DEFAULT 0,
  jumlah_maksimum DECIMAL(15, 3),
  lokasi_rak VARCHAR(100),
  unit_cost DECIMAL(15, 2),
  last_transaction_at TIMESTAMPTZ,
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inventory_bahan_baku_id ON inventory(bahan_baku_id);
CREATE INDEX idx_inventory_lokasi ON inventory(lokasi_rak);
CREATE INDEX idx_inventory_is_active ON inventory(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON inventory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE inventory IS 'Tabel stok inventory bahan baku saat ini';
