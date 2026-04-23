-- ============================================
-- Migration: Set Default Minimum Stock to 1000
-- Date: 2026-04-23
-- Description: Add qty_minimum column and set default value
-- ============================================

-- Step 1: Add qty_minimum column if not exists (with default 1000)
ALTER TABLE inventory 
ADD COLUMN IF NOT EXISTS qty_minimum NUMERIC DEFAULT 1000;

-- Step 2: Update existing records to have qty_minimum = 1000
UPDATE inventory 
SET qty_minimum = 1000 
WHERE qty_minimum IS NULL OR qty_minimum = 0;

-- Step 3: Add comment to document the column
COMMENT ON COLUMN inventory.qty_minimum IS 'Minimum stock level before reorder alert (default: 1000 units)';

-- Step 4: Create index for faster low-stock queries
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
ON inventory(qty_minimum, qty_available) 
WHERE is_active = true;

-- Step 5: Verify the update
SELECT 
  rm.kode,
  rm.nama,
  inv.qty_available as "Current Stock",
  inv.qty_minimum as "Minimum Stock",
  CASE 
    WHEN inv.qty_available <= 0 THEN '❌ HABIS'
    WHEN inv.qty_available <= inv.qty_minimum THEN '⚠️ MENIPIS'
    ELSE '✅ AMAN'
  END as status
FROM inventory inv
JOIN raw_materials rm ON rm.id = inv.raw_material_id
ORDER BY inv.qty_available ASC
LIMIT 10;

-- Step 6: Show summary
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE qty_available <= 0) as out_of_stock,
  COUNT(*) FILTER (WHERE qty_available > 0 AND qty_available <= qty_minimum) as low_stock,
  COUNT(*) FILTER (WHERE qty_available > qty_minimum) as adequate_stock,
  AVG(qty_minimum) as avg_minimum,
  SUM(qty_available) as total_stock_value
FROM inventory
WHERE is_active = true;
