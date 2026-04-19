-- Migration: create_delivery_table
-- Supplier delivery/shipment tracking

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomor_resi VARCHAR(100),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  tanggal_kirim DATE,
  tanggal_estimasi_tiba DATE,
  tanggal_aktual_tiba DATE,
  kurir VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'shipped', 'in_transit', 'delivered', 'cancelled')),
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deliveries_po_id ON deliveries(purchase_order_id);
CREATE INDEX idx_deliveries_supplier_id ON deliveries(supplier_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_nomor_resi ON deliveries(nomor_resi);
CREATE INDEX idx_deliveries_is_active ON deliveries(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_deliveries_updated_at
BEFORE UPDATE ON deliveries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE deliveries IS 'Tabel tracking pengiriman dari supplier';
