-- ============================================
-- FIX: Add missing fields to v_raw_materials_stock
-- Date: 2025-04-23
-- ============================================

-- Drop old view if exists
DROP VIEW IF EXISTS v_raw_materials_stock CASCADE;

-- Create view with ALL fields from raw_materials
CREATE OR REPLACE VIEW v_raw_materials_stock AS
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
    u1.nama as satuan_besar_nama,
    u2.nama as satuan_kecil_nama,
    COALESCE(i.qty_available, 0) as qty_onhand,
    0 as qty_reserved,
    COALESCE(i.qty_on_order, 0) as qty_on_order,
    COALESCE(i.unit_cost, 0) as avg_cost,
    CASE
        WHEN COALESCE(i.qty_available, 0) <= 0 THEN 'HABIS'
        WHEN COALESCE(i.qty_available, 0) <= COALESCE(i.qty_minimum, rm.stok_minimum) THEN 'MENIPIS'
        ELSE 'AMAN'
    END as status_stok
FROM raw_materials rm
LEFT JOIN units u1 ON rm.satuan_besar_id = u1.id
LEFT JOIN units u2 ON rm.satuan_kecil_id = u2.id
LEFT JOIN inventory i ON rm.id = i.raw_material_id
WHERE rm.deleted_at IS NULL AND rm.is_active = TRUE;

-- Add comment
COMMENT ON VIEW v_raw_materials_stock IS 'View lengkap untuk raw materials dengan stock info';
