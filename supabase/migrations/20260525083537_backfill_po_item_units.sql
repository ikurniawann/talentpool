-- Backfill purchase order item units from raw material default large unit.

UPDATE public.purchase_order_items poi
SET satuan_id = rm.satuan_besar_id,
    updated_at = NOW()
FROM public.raw_materials rm
WHERE poi.raw_material_id = rm.id
  AND poi.satuan_id IS NULL
  AND rm.satuan_besar_id IS NOT NULL;
