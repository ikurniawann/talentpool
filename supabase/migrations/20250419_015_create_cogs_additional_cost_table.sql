-- Migration: create_cogs_additional_cost_table
-- Additional costs for COGS calculation (shipping, import duty, etc)

CREATE TABLE IF NOT EXISTS cogs_additional_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_type VARCHAR(50) NOT NULL, -- purchase_order, goods_receipt, etc
  reference_id UUID NOT NULL,
  tipe_biaya VARCHAR(50) NOT NULL
    CHECK (tipe_biaya IN ('shipping', 'import_tax', 'customs', 'insurance', 'handling', 'other')),
  deskripsi TEXT,
  jumlah DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
  exchange_rate DECIMAL(15, 6) DEFAULT 1,
  jumlah_idr DECIMAL(15, 2),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  tanggal_transaksi DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cogs_reference ON cogs_additional_costs(reference_type, reference_id);
CREATE INDEX idx_cogs_tipe ON cogs_additional_costs(tipe_biaya);
CREATE INDEX idx_cogs_supplier ON cogs_additional_costs(supplier_id);
CREATE INDEX idx_cogs_tanggal ON cogs_additional_costs(tanggal_transaksi);
CREATE INDEX idx_cogs_is_active ON cogs_additional_costs(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_cogs_updated_at
BEFORE UPDATE ON cogs_additional_costs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto calculate IDR amount
CREATE OR REPLACE FUNCTION calculate_cogs_idr()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.jumlah_idr IS NULL THEN
    NEW.jumlah_idr := NEW.jumlah * NEW.exchange_rate;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_cogs_idr
BEFORE INSERT OR UPDATE ON cogs_additional_costs
FOR EACH ROW
EXECUTE FUNCTION calculate_cogs_idr();

COMMENT ON TABLE cogs_additional_costs IS 'Tabel biaya tambahan untuk perhitungan COGS (ongkir, bea cukai, dll)';
