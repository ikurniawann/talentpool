-- Migration: create_goods_receipt_table
-- Goods receipt (GRN) table

CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomor_gr VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  tanggal_terima DATE NOT NULL DEFAULT CURRENT_DATE,
  penerima_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'partial', 'completed', 'rejected')),
  total_item DECIMAL(15, 3) DEFAULT 0,
  total_diterima DECIMAL(15, 3) DEFAULT 0,
  total_ditolak DECIMAL(15, 3) DEFAULT 0,
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_gr_nomor ON goods_receipts(nomor_gr);
CREATE INDEX idx_gr_po_id ON goods_receipts(purchase_order_id);
CREATE INDEX idx_gr_delivery_id ON goods_receipts(delivery_id);
CREATE INDEX idx_gr_status ON goods_receipts(status);
CREATE INDEX idx_gr_tanggal ON goods_receipts(tanggal_terima);
CREATE INDEX idx_gr_is_active ON goods_receipts(is_active);

-- Function to generate GR number
CREATE OR REPLACE FUNCTION generate_gr_number()
RETURNS TRIGGER AS $$
DECLARE
  year TEXT;
  sequence_number INTEGER;
  new_number TEXT;
BEGIN
  year := TO_CHAR(NEW.tanggal_terima, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_gr FROM 'GR-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM goods_receipts
  WHERE nomor_gr LIKE 'GR-' || year || '-%';
  
  new_number := 'GR-' || year || '-' || LPAD(sequence_number::TEXT, 5, '0');
  NEW.nomor_gr := new_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generate GR number
CREATE TRIGGER trigger_generate_gr_number
BEFORE INSERT ON goods_receipts
FOR EACH ROW
WHEN (NEW.nomor_gr IS NULL)
EXECUTE FUNCTION generate_gr_number();

-- Trigger for updated_at
CREATE TRIGGER update_gr_updated_at
BEFORE UPDATE ON goods_receipts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE goods_receipts IS 'Tabel Goods Receipt (penerimaan barang)';
