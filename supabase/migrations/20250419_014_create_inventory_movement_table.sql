-- Migration: create_inventory_movement_table
-- Inventory movement tracking table

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  bahan_baku_id UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE RESTRICT,
  tipe VARCHAR(20) NOT NULL
    CHECK (tipe IN ('in', 'out', 'adjustment', 'transfer', 'return')),
  jumlah DECIMAL(15, 3) NOT NULL,
  unit_cost DECIMAL(15, 2),
  total_cost DECIMAL(15, 2),
  reference_type VARCHAR(50), -- purchase_order, goods_receipt, return, adjustment, etc
  reference_id UUID,
  sebelum DECIMAL(15, 3) NOT NULL,
  sesudah DECIMAL(15, 3) NOT NULL,
  alasan TEXT,
  tanggal_movement TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_im_inventory_id ON inventory_movements(inventory_id);
CREATE INDEX idx_im_bahan_baku_id ON inventory_movements(bahan_baku_id);
CREATE INDEX idx_im_tipe ON inventory_movements(tipe);
CREATE INDEX idx_im_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX idx_im_tanggal ON inventory_movements(tanggal_movement);
CREATE INDEX idx_im_is_active ON inventory_movements(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_im_updated_at
BEFORE UPDATE ON inventory_movements
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE inventory_movements IS 'Tabel riwayat pergerakan stok inventory';
