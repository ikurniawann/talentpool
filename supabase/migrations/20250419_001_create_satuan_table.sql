-- Migration: create_satuan_table
-- Units of measurement table

CREATE TABLE IF NOT EXISTS satuan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX idx_satuan_kode ON satuan(kode);
CREATE INDEX idx_satuan_is_active ON satuan(is_active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_satuan_updated_at
BEFORE UPDATE ON satuan
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE satuan IS 'Tabel satuan unit (kg, pcs, liter, dll)';
