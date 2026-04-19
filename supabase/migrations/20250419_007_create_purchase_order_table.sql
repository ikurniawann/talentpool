-- Migration: create_purchase_order_table
-- Purchase orders header table

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomor_po VARCHAR(50) UNIQUE NOT NULL,
  tanggal_po DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_dibutuhkan DATE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'partial', 'completed', 'cancelled', 'rejected')),
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  diskon_persen DECIMAL(5, 2) DEFAULT 0,
  diskon_nominal DECIMAL(15, 2) DEFAULT 0,
  ppn_persen DECIMAL(5, 2) DEFAULT 11,
  ppn_nominal DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  catatan TEXT,
  terms TEXT,
  alamat_pengiriman TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_po_nomor ON purchase_orders(nomor_po);
CREATE INDEX idx_po_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_tanggal ON purchase_orders(tanggal_po);
CREATE INDEX idx_po_is_active ON purchase_orders(is_active);

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
  year TEXT;
  sequence_number INTEGER;
  new_number TEXT;
BEGIN
  year := TO_CHAR(NEW.tanggal_po, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_po FROM 'PO-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM purchase_orders
  WHERE nomor_po LIKE 'PO-' || year || '-%';
  
  new_number := 'PO-' || year || '-' || LPAD(sequence_number::TEXT, 5, '0');
  NEW.nomor_po := new_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generate PO number
CREATE TRIGGER trigger_generate_po_number
BEFORE INSERT ON purchase_orders
FOR EACH ROW
WHEN (NEW.nomor_po IS NULL)
EXECUTE FUNCTION generate_po_number();

-- Trigger for updated_at
CREATE TRIGGER update_po_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE purchase_orders IS 'Tabel Purchase Order header';
