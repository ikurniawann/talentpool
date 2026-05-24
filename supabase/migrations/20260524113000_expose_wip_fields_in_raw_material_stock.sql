-- Expose WIP metadata in raw material stock view so BOM editors can show
-- whether a component is purchased material or produced WIP.

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
    rm.source_product_id
FROM public.raw_materials rm
LEFT JOIN public.units u1 ON rm.satuan_besar_id = u1.id
LEFT JOIN public.units u2 ON rm.satuan_kecil_id = u2.id
LEFT JOIN public.inventory i ON rm.id = i.raw_material_id
WHERE rm.deleted_at IS NULL AND rm.is_active = TRUE;
