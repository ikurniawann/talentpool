-- Support WIP (Work in Progress) production output.
-- A produced product can become a stockable raw material for the next BOM layer.

ALTER TABLE public.raw_materials
  ADD COLUMN IF NOT EXISTS material_type VARCHAR(20) NOT NULL DEFAULT 'PURCHASED',
  ADD COLUMN IF NOT EXISTS source_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'raw_materials_material_type_check'
  ) THEN
    ALTER TABLE public.raw_materials
      ADD CONSTRAINT raw_materials_material_type_check
      CHECK (material_type IN ('PURCHASED','WIP'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_materials_source_product
  ON public.raw_materials(source_product_id)
  WHERE source_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_raw_materials_material_type
  ON public.raw_materials(material_type);

ALTER TABLE public.production_orders
  ADD COLUMN IF NOT EXISTS output_type VARCHAR(20) NOT NULL DEFAULT 'FINISHED_GOOD';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'production_orders_output_type_check'
  ) THEN
    ALTER TABLE public.production_orders
      ADD CONSTRAINT production_orders_output_type_check
      CHECK (output_type IN ('FINISHED_GOOD','WIP'));
  END IF;
END $$;

ALTER TABLE public.production_batches
  ADD COLUMN IF NOT EXISTS output_type VARCHAR(20) NOT NULL DEFAULT 'FINISHED_GOOD',
  ADD COLUMN IF NOT EXISTS wip_raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'production_batches_output_type_check'
  ) THEN
    ALTER TABLE public.production_batches
      ADD CONSTRAINT production_batches_output_type_check
      CHECK (output_type IN ('FINISHED_GOOD','WIP'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_production_batches_wip_material
  ON public.production_batches(wip_raw_material_id);

DROP VIEW IF EXISTS public.v_production_orders;

CREATE VIEW public.v_production_orders AS
SELECT
  po.id,
  po.nomor_produksi,
  po.product_id,
  po.outlet_id,
  po.planned_qty,
  po.actual_qty,
  po.status,
  po.planned_material_cost,
  po.actual_material_cost,
  po.overhead_cost,
  po.labor_cost,
  po.packaging_cost,
  po.waste_cost,
  po.hpp_per_unit,
  po.catatan,
  po.started_at,
  po.completed_at,
  po.cancelled_at,
  po.created_by,
  po.updated_by,
  po.created_at,
  po.updated_at,
  po.output_type,
  p.kode AS product_kode,
  p.nama AS product_nama,
  p.harga_jual,
  wip.id AS wip_raw_material_id,
  wip.kode AS wip_raw_material_kode,
  wip.nama AS wip_raw_material_nama,
  COALESCE(material_summary.total_materials, 0) AS total_materials,
  COALESCE(batch_summary.total_batches, 0) AS total_batches
FROM public.production_orders po
JOIN public.products p ON p.id = po.product_id
LEFT JOIN public.raw_materials wip ON wip.source_product_id = po.product_id
LEFT JOIN (
  SELECT production_order_id, COUNT(*) AS total_materials
  FROM public.production_order_materials
  GROUP BY production_order_id
) material_summary ON material_summary.production_order_id = po.id
LEFT JOIN (
  SELECT production_order_id, COUNT(*) AS total_batches
  FROM public.production_batches
  GROUP BY production_order_id
) batch_summary ON batch_summary.production_order_id = po.id;
