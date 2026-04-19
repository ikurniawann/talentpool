-- Migration: create_return_table
-- Return to supplier table

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomor_return VARCHAR(50) UNIQUE NOT NULL,
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  bahan_baku_id UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE RESTRICT,
  jumlah DECIMAL(15, 3) NOT NULL,
  satuan_id UUID NOT NULL REFERENCES satuan(id) ON DELETE RESTRICT,
  alasan TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'shipped', 'received_by_supplier', 'completed', 'cancelled')),
  tanggal_pengembalian DATE,
  nomor_resi VARCHAR(100),
  catatan TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_returns_nomor ON returns(nomor_return);
CREATE INDEX idx_returns_gr_id ON returns(goods_receipt_id);
CREATE INDEX idx_returns_supplier_id ON returns(supplier_id);
CREATE INDEX idx_returns_bahan_baku_id ON returns(bahan_baku_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_is_active ON returns(is_active);

-- Function to generate Return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  year TEXT;
  sequence_number INTEGER;
  new_number TEXT;
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_return FROM 'RET-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM returns
  WHERE nomor_return LIKE 'RET-' || year || '-%';
  
  new_number := 'RET-' || year || '-' || LPAD(sequence_number::TEXT, 5, '0');
  NEW.nomor_return := new_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generate Return number
CREATE TRIGGER trigger_generate_return_number
BEFORE INSERT ON returns
FOR EACH ROW
WHEN (NEW.nomor_return IS NULL)
EXECUTE FUNCTION generate_return_number();

-- Trigger for updated_at
CREATE TRIGGER update_returns_updated_at
BEFORE UPDATE ON returns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE returns IS 'Tabel return barang ke supplier';
