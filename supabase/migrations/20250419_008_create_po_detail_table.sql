-- Migration: create_po_detail_table
-- Purchase order detail/items table

CREATE TABLE IF NOT EXISTS po_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  bahan_baku_id UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE RESTRICT,
  jumlah DECIMAL(15, 3) NOT NULL,
  satuan_id UUID NOT NULL REFERENCES satuan(id) ON DELETE RESTRICT,
  harga_unit DECIMAL(15, 2) NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  diskon_persen DECIMAL(5, 2) DEFAULT 0,
  diskon_nominal DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  jumlah_diterima DECIMAL(15, 3) DEFAULT 0,
  catatan TEXT,
  urutan INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_po_detail_po_id ON po_details(purchase_order_id);
CREATE INDEX idx_po_detail_bahan_baku_id ON po_details(bahan_baku_id);
CREATE INDEX idx_po_detail_is_active ON po_details(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_po_detail_updated_at
BEFORE UPDATE ON po_details
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE po_details IS 'Tabel detail item Purchase Order';
