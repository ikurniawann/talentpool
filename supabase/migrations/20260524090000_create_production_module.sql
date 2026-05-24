-- Production module foundation: convert raw materials into finished products
-- and store actual HPP per production batch.

CREATE TABLE IF NOT EXISTS public.production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_produksi VARCHAR(40) UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  outlet_id UUID,
  planned_qty NUMERIC(15,3) NOT NULL CHECK (planned_qty > 0),
  actual_qty NUMERIC(15,3) NOT NULL DEFAULT 0 CHECK (actual_qty >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','RELEASED','IN_PROGRESS','COMPLETED','CANCELLED')),
  planned_material_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_material_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  overhead_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  labor_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  packaging_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  waste_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  hpp_per_unit NUMERIC(15,2) NOT NULL DEFAULT 0,
  catatan TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  satuan_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  qty_planned NUMERIC(15,4) NOT NULL DEFAULT 0,
  qty_actual NUMERIC(15,4) NOT NULL DEFAULT 0,
  waste_qty NUMERIC(15,4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  inventory_movement_id UUID REFERENCES public.inventory_movements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  batch_number VARCHAR(60) UNIQUE NOT NULL,
  qty_produced NUMERIC(15,3) NOT NULL DEFAULT 0,
  hpp_per_unit NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  expiry_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
    CHECK (status IN ('AVAILABLE','RESERVED','CONSUMED','VOID')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finished_goods_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE RESTRICT,
  qty_available NUMERIC(15,3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  last_movement_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_orders_product ON public.production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON public.production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_created_at ON public.production_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_materials_order ON public.production_order_materials(production_order_id);
CREATE INDEX IF NOT EXISTS idx_production_materials_raw_material ON public.production_order_materials(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_order ON public.production_batches(production_order_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_inventory_product ON public.finished_goods_inventory(product_id);

CREATE OR REPLACE VIEW public.v_production_orders AS
SELECT
  po.*,
  p.kode AS product_kode,
  p.nama AS product_nama,
  p.harga_jual,
  COALESCE(material_summary.total_materials, 0) AS total_materials,
  COALESCE(batch_summary.total_batches, 0) AS total_batches
FROM public.production_orders po
JOIN public.products p ON p.id = po.product_id
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

CREATE OR REPLACE VIEW public.v_finished_goods_stock AS
SELECT
  fgi.*,
  p.kode AS product_kode,
  p.nama AS product_nama,
  p.kategori AS product_kategori,
  p.harga_jual,
  (fgi.qty_available * COALESCE(fgi.unit_cost, 0)) AS total_value
FROM public.finished_goods_inventory fgi
JOIN public.products p ON p.id = fgi.product_id
WHERE fgi.is_active = TRUE;
