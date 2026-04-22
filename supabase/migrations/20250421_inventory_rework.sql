-- Inventory rework: pakai raw_material_id (bukan bahan_baku_id)
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_material_id UUID NOT NULL UNIQUE REFERENCES raw_materials(id) ON DELETE CASCADE,
  qty_available DECIMAL(15,3) NOT NULL DEFAULT 0,
  qty_on_order DECIMAL(15,3) NOT NULL DEFAULT 0,
  qty_minimum DECIMAL(15,3) NOT NULL DEFAULT 0,
  qty_maximum DECIMAL(15,3),
  unit_cost DECIMAL(15,2) DEFAULT 0,
  lokasi_rak VARCHAR(100),
  last_movement_at TIMESTAMPTZ,
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
  tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('in','out','adjustment','transfer','return')),
  jumlah DECIMAL(15,3) NOT NULL,
  qty_before DECIMAL(15,3) NOT NULL,
  qty_after DECIMAL(15,3) NOT NULL,
  unit_cost DECIMAL(15,2),
  total_cost DECIMAL(15,2),
  reference_type VARCHAR(50),
  reference_id UUID,
  reference_number VARCHAR(100),
  alasan TEXT,
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_raw_material ON inventory(raw_material_id);
CREATE INDEX idx_inventory_is_active ON inventory(is_active);
CREATE INDEX idx_im_inventory_id ON inventory_movements(inventory_id);
CREATE INDEX idx_im_raw_material ON inventory_movements(raw_material_id);
CREATE INDEX idx_im_tipe ON inventory_movements(tipe);
CREATE INDEX idx_im_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX idx_im_created_at ON inventory_movements(created_at DESC);

CREATE OR REPLACE VIEW v_inventory AS
SELECT
  i.*,
  (i.qty_available * COALESCE(i.unit_cost, 0)) as total_value,
  rm.kode as material_kode,
  rm.nama as material_nama,
  rm.kategori as material_kategori,
  CASE
    WHEN i.qty_available <= 0 THEN 'out_of_stock'
    WHEN i.qty_available <= i.qty_minimum THEN 'low_stock'
    WHEN i.qty_maximum IS NOT NULL AND i.qty_available >= i.qty_maximum THEN 'overstock'
    ELSE 'normal'
  END as stock_status
FROM inventory i
JOIN raw_materials rm ON rm.id = i.raw_material_id
WHERE i.is_active = true;
