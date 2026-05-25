-- Backfill Goods Receipt / Barang Masuk item units for existing data.
-- Priority:
-- 1. Unit from linked PO item.
-- 2. Default large unit from raw material.

UPDATE public.grn_items gi
SET satuan_id = source.unit_id,
    updated_at = NOW()
FROM (
  SELECT
    item.id AS grn_item_id,
    COALESCE(po_item.satuan_id, material.satuan_besar_id) AS unit_id
  FROM public.grn_items item
  JOIN public.raw_materials material ON material.id = item.raw_material_id
  LEFT JOIN public.purchase_order_items po_item ON po_item.id = item.purchase_order_item_id
  WHERE item.satuan_id IS NULL
) source
WHERE gi.id = source.grn_item_id
  AND source.unit_id IS NOT NULL;
