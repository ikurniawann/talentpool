-- Migration: create_qc_table
-- Quality control inspection table

CREATE TABLE IF NOT EXISTS qc_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goods_receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  bahan_baku_id UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE RESTRICT,
  jumlah_diperiksa DECIMAL(15, 3) NOT NULL DEFAULT 0,
  jumlah_diterima DECIMAL(15, 3) NOT NULL DEFAULT 0,
  jumlah_ditolak DECIMAL(15, 3) NOT NULL DEFAULT 0,
  hasil VARCHAR(20) NOT NULL DEFAULT 'pending' 
    CHECK (hasil IN ('pending', 'passed', 'rejected', 'partial')),
  parameter_inspeksi JSONB,
  catatan TEXT,
  inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tanggal_inspeksi TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_qc_gr_id ON qc_inspections(goods_receipt_id);
CREATE INDEX idx_qc_bahan_baku_id ON qc_inspections(bahan_baku_id);
CREATE INDEX idx_qc_hasil ON qc_inspections(hasil);
CREATE INDEX idx_qc_inspector ON qc_inspections(inspector_id);
CREATE INDEX idx_qc_tanggal ON qc_inspections(tanggal_inspeksi);
CREATE INDEX idx_qc_is_active ON qc_inspections(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_qc_updated_at
BEFORE UPDATE ON qc_inspections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE qc_inspections IS 'Tabel Quality Control inspection';
