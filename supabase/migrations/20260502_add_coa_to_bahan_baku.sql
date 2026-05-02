ALTER TABLE bahan_baku
  ADD COLUMN IF NOT EXISTS coa_production VARCHAR(50),
  ADD COLUMN IF NOT EXISTS coa_rnd VARCHAR(50),
  ADD COLUMN IF NOT EXISTS coa_asset VARCHAR(50);

COMMENT ON COLUMN bahan_baku.coa_production IS 'COA account code for production usage';
COMMENT ON COLUMN bahan_baku.coa_rnd IS 'COA account code for R&D usage';
COMMENT ON COLUMN bahan_baku.coa_asset IS 'COA account code for asset usage';
