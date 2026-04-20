-- Migration: update_bahan_baku_table
-- Step 1: Handle existing data with invalid kategori values
-- Step 2: Add new columns
-- Step 3: Add enum constraint

-- ============================================================
-- STEP 1: Normalize existing kategori values to new enum
-- ============================================================

-- First, see what values exist (for safety/debug)
-- No action needed, we just map known old values

-- Update NULL or empty-string kategori to NULL (allowed by new constraint)
UPDATE bahan_baku SET kategori = NULL
  WHERE kategori IS NULL OR trim(kategori) = '';

-- Map any existing non-standard values to LAINNYA
-- (This prevents constraint violation from existing data)
UPDATE bahan_baku SET kategori = 'LAINNYA'
  WHERE kategori IS NOT NULL
    AND kategori NOT IN ('BAHAN_PANGAN', 'BAHAN_NON_PANGAN', 'KEMASAN', 'BAHAN_BAKAR', 'LAINNYA');

-- ============================================================
-- STEP 2: Add new columns
-- ============================================================

-- Drop existing chk_kategori if exists (may be from previous failed run)
ALTER TABLE bahan_baku DROP CONSTRAINT IF EXISTS chk_kategori;

-- Add satuan_kecil_id (dual unit system: besar/kecil)
ALTER TABLE bahan_baku
  ADD COLUMN IF NOT EXISTS satuan_kecil_id UUID REFERENCES satuan(id) ON DELETE SET NULL;

-- Add konversi_factor (how many kecil = 1 besar)
ALTER TABLE bahan_baku
  ADD COLUMN IF NOT EXISTS konversi_factor DECIMAL(10, 4) DEFAULT 1;

-- Add shelf_life_days
ALTER TABLE bahan_baku
  ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER DEFAULT 0;

-- Add storage_condition
ALTER TABLE bahan_baku
  ADD COLUMN IF NOT EXISTS storage_condition VARCHAR(50) DEFAULT 'ambient';

-- Drop current_stock (moved to inventory table as jumlah_tersedia)
ALTER TABLE bahan_baku DROP COLUMN IF EXISTS current_stock;

-- ============================================================
-- STEP 3: Add enum constraint for kategori
-- ============================================================

-- NOTE: Fixed typo BAAN_BAKAR -> BAHAN_BAKAR
ALTER TABLE bahan_baku ADD CONSTRAINT chk_kategori
  CHECK (kategori IN ('BAHAN_PANGAN', 'BAHAN_NON_PANGAN', 'KEMASAN', 'BAHAN_BAKAR', 'LAINNYA') OR kategori IS NULL);

-- ============================================================
-- STEP 4: Add konversi_factor to inventory
-- ============================================================

ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS konversi_factor DECIMAL(10, 4) DEFAULT 1;

-- ============================================================
-- STEP 5: Add waste_percentage to BOM
-- ============================================================

ALTER TABLE bom
  ADD COLUMN IF NOT EXISTS waste_percentage DECIMAL(5, 2) DEFAULT 0;

-- ============================================================
-- STEP 6: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bahan_baku_satuan_kecil ON bahan_baku(satuan_kecil_id);
CREATE INDEX IF NOT EXISTS idx_bahan_baku_konversi ON bahan_baku(konversi_factor);
CREATE INDEX IF NOT EXISTS idx_bahan_baku_shelf_life ON bahan_baku(shelf_life_days);

-- ============================================================
-- Verify
-- ============================================================

DO $$
BEGIN
  -- Test constraint
  -- This should NOT raise if previous updates worked
  IF EXISTS (
    SELECT 1 FROM bahan_baku
    WHERE kategori IS NOT NULL
      AND kategori NOT IN ('BAHAN_PANGAN', 'BAHAN_NON_PANGAN', 'KEMASAN', 'BAHAN_BAKAR', 'LAINNYA')
  ) THEN
    RAISE WARNING 'Some rows still have invalid kategori values - constraint may fail';
  ELSE
    RAISE NOTICE 'Migration 20250420_001 complete: bahan_baku updated successfully';
  END IF;
END $$;
