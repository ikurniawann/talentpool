-- ============================================
-- FIX: Update v_products_cogs view
-- Date: 2025-04-23
-- ============================================

-- Drop old view if exists
DROP VIEW IF EXISTS v_products_cogs CASCADE;

-- Create view: Products dengan HPP estimasi
CREATE OR REPLACE VIEW v_products_cogs AS
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
    u.nama as satuan_nama,
    COALESCE(bom.total_bahan, 0) as total_bahan_baku,
    COALESCE(bom.estimated_cogs, 0) as estimated_cogs,
    COALESCE(bom.estimated_cogs, 0) as hpp_estimasi
FROM products p
LEFT JOIN units u ON p.satuan_id = u.id
LEFT JOIN (
    SELECT 
        bi.product_id,
        COUNT(*) as total_bahan,
        SUM(bi.qty_required * (1 + COALESCE(bi.waste_factor, 0)) * COALESCE(i.unit_cost, 0)) as estimated_cogs
    FROM bom_items bi
    LEFT JOIN raw_materials rm ON bi.raw_material_id = rm.id
    LEFT JOIN inventory i ON rm.id = i.raw_material_id
    WHERE bi.is_active = TRUE
    GROUP BY bi.product_id
) bom ON p.id = bom.product_id
WHERE p.deleted_at IS NULL AND p.is_active = TRUE;

-- Add comment
COMMENT ON VIEW v_products_cogs IS 'View untuk menampilkan produk dengan estimasi HPP dari BOM';
