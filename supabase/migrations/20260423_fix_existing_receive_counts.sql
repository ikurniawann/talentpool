-- ============================================
-- FIX: Update receive_count for existing GRNs
-- Date: 2026-04-23
-- Description: Set proper receive_count for all existing GRNs based on delivery_id
-- ============================================

-- Update receive_count for all existing GRNs using window function
WITH ranked_grns AS (
  SELECT 
    id,
    delivery_id,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY delivery_id 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM grn
  WHERE is_active = TRUE
)
UPDATE grn
SET receive_count = ranked_grns.rn
FROM ranked_grns
WHERE grn.id = ranked_grns.id
  AND grn.status != 'rejected'; -- Don't count rejected in sequence

-- For rejected GRNs, set receive_count to NULL or keep as is
-- They are excluded from the count anyway

-- Verify the update
SELECT 
  delivery_id,
  COUNT(*) as total_grns,
  MAX(receive_count) as max_receive_count,
  STRING_AGG(nomor_grn || ' (#' || receive_count || ')', ', ' ORDER BY receive_count) as grns_with_count
FROM grn
WHERE is_active = TRUE
GROUP BY delivery_id
HAVING COUNT(*) > 1
ORDER BY delivery_id;
