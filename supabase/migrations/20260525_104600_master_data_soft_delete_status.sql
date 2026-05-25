-- ============================================
-- Normalize master data soft delete metadata
-- ============================================

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_units_not_deleted
  ON units (is_active, nama)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_suppliers_not_deleted
  ON suppliers (is_active, nama_supplier)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_raw_materials_not_deleted
  ON raw_materials (is_active, nama)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_not_deleted
  ON products (is_active, nama)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_raw_materials_stock AS
SELECT
    rm.id,
    rm.kode,
    rm.nama,
    rm.kategori,
    rm.deskripsi,
    rm.satuan_besar_id,
    rm.satuan_kecil_id,
    rm.konversi_factor,
    rm.stok_minimum,
    rm.stok_maximum,
    rm.shelf_life_days,
    rm.storage_condition,
    rm.is_active,
    rm.created_at,
    rm.updated_at,
    rm.created_by,
    rm.updated_by,
    u1.nama AS satuan_besar_nama,
    u2.nama AS satuan_kecil_nama,
    COALESCE(i.qty_available, 0) AS qty_onhand,
    0 AS qty_reserved,
    COALESCE(i.qty_on_order, 0) AS qty_on_order,
    COALESCE(i.unit_cost, 0) AS avg_cost,
    CASE
        WHEN COALESCE(i.qty_available, 0) <= 0 THEN 'HABIS'
        WHEN COALESCE(i.qty_available, 0) <= COALESCE(i.qty_minimum, rm.stok_minimum) THEN 'MENIPIS'
        ELSE 'AMAN'
    END AS status_stok,
    COALESCE(rm.material_type, 'PURCHASED') AS material_type,
    rm.source_product_id,
    rm.deleted_at,
    rm.deleted_by
FROM public.raw_materials rm
LEFT JOIN public.units u1 ON rm.satuan_besar_id = u1.id
LEFT JOIN public.units u2 ON rm.satuan_kecil_id = u2.id
LEFT JOIN public.inventory i ON rm.id = i.raw_material_id
WHERE rm.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_products_cogs AS
SELECT
    p.id,
    p.kode,
    p.nama,
    p.deskripsi,
    p.kategori,
    p.satuan_id,
    p.harga_jual,
    p.is_active,
    p.created_at,
    p.updated_at,
    p.created_by,
    p.updated_by,
    p.deleted_at,
    p.deleted_by,
    u.nama AS satuan_nama,
    COALESCE(bom.total_bahan, 0) AS total_bahan_baku,
    COALESCE(bom.estimated_cogs, 0) AS estimated_cogs,
    COALESCE(bom.estimated_cogs, 0) AS hpp_estimasi
FROM public.products p
LEFT JOIN public.units u ON p.satuan_id = u.id
LEFT JOIN (
    SELECT
        bi.product_id,
        COUNT(*) AS total_bahan,
        SUM(bi.qty_required * (1 + COALESCE(bi.waste_factor, 0)) * COALESCE(i.unit_cost, 0)) AS estimated_cogs
    FROM public.bom_items bi
    LEFT JOIN public.raw_materials rm ON bi.raw_material_id = rm.id
    LEFT JOIN public.inventory i ON rm.id = i.raw_material_id
    WHERE bi.is_active = TRUE
    GROUP BY bi.product_id
) bom ON p.id = bom.product_id
WHERE p.deleted_at IS NULL;
