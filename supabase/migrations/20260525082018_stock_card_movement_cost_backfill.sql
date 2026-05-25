-- Backfill stock card movement value from inventory average cost when old
-- movements were created with 0 unit_cost / total_cost.

UPDATE public.inventory_movements im
SET unit_cost = COALESCE(NULLIF(im.unit_cost, 0), i.unit_cost, 0),
    total_cost = CASE
      WHEN COALESCE(im.total_cost, 0) = 0 THEN ABS(COALESCE(im.jumlah, 0)) * COALESCE(NULLIF(im.unit_cost, 0), i.unit_cost, 0)
      ELSE im.total_cost
    END,
    updated_at = NOW()
FROM public.inventory i
WHERE i.raw_material_id = im.raw_material_id
  AND i.is_active = TRUE
  AND (
    COALESCE(im.unit_cost, 0) = 0
    OR COALESCE(im.total_cost, 0) = 0
  );
