-- Migration: create_supplier_table
-- Suppliers/vendors table

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(200) NOT NULL,
  alamat TEXT,
  telepon VARCHAR(50),
  email VARCHAR(100),
  npwp VARCHAR(50),
  bank_nama VARCHAR(100),
  bank_rekening VARCHAR(100),
  bank_atas_nama VARCHAR(200),
  kategori VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_suppliers_kode ON suppliers(kode);
CREATE INDEX idx_suppliers_nama ON suppliers(nama);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE suppliers IS 'Tabel supplier/vendors';
