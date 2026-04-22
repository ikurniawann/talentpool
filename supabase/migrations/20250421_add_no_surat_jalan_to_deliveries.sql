-- Migration: Add no_surat_jalan field to deliveries table
-- Untuk menyimpan nomor surat jalan dari supplier

ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS no_surat_jalan VARCHAR(100);

-- Index untuk pencarian
CREATE INDEX IF NOT EXISTS idx_deliveries_no_surat_jalan ON deliveries(no_surat_jalan);

COMMENT ON COLUMN deliveries.no_surat_jalan IS 'Nomor surat jalan dari supplier';
