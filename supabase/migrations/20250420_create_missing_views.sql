-- ============================================
-- FIX: Create missing views for Purchasing module
-- ============================================

-- 1. View: Products dengan HPP
CREATE OR REPLACE VIEW v_products_cogs AS
SELECT 
    p.*,
    u.nama as satuan_nama,
    COALESCE(bom.total_bahan, 0) as total_bahan_baku,
    COALESCE(bom.estimated_cogs, 0) as estimated_cogs
FROM products p
LEFT JOIN units u ON p.satuan_id = u.id
LEFT JOIN (
    SELECT 
        product_id,
        COUNT(*) as total_bahan,
        SUM(bi.qty_required * COALESCE(spl.harga, 0)) as estimated_cogs
    FROM bom_items bi
    LEFT JOIN raw_materials rm ON bi.raw_material_id = rm.id
    LEFT JOIN supplier_price_list spl ON rm.id = spl.raw_material_id AND spl.is_preferred = TRUE
    WHERE bi.is_active = TRUE
    GROUP BY product_id
) bom ON p.id = bom.product_id
WHERE p.deleted_at IS NULL AND p.is_active = TRUE;

-- 2. View: Purchase Orders dengan summary
CREATE OR REPLACE VIEW v_purchase_orders AS
SELECT 
    po.*,
    s.nama_supplier,
    s.kode as supplier_kode,
    s.pic_name as supplier_pic,
    s.email as supplier_email,
    COALESCE(item_summary.total_items, 0) as total_items,
    COALESCE(item_summary.total_qty, 0) as total_qty,
    COALESCE(item_summary.total_value, 0) as total_value,
    COALESCE(item_summary.grand_total, 0) as grand_total,
    COALESCE(item_summary.received_items, 0) as received_items
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN (
    SELECT 
        purchase_order_id,
        COUNT(*) as total_items,
        SUM(qty_ordered) as total_qty,
        SUM(qty_ordered * harga_satuan - COALESCE(diskon_item, 0)) as total_value,
        SUM((qty_ordered * harga_satuan - COALESCE(diskon_item, 0)) * 
            (1 - COALESCE(po.diskon_persen, 0)/100) * 
            (1 + COALESCE(po.ppn_persen, 11)/100)) as grand_total,
        COUNT(CASE WHEN qty_received >= qty_ordered THEN 1 END) as received_items
    FROM purchase_order_items poi
    JOIN purchase_orders po ON poi.purchase_order_id = po.id
    GROUP BY purchase_order_id
) item_summary ON po.id = item_summary.purchase_order_id
WHERE po.deleted_at IS NULL;

-- Add comments
COMMENT ON VIEW v_products_cogs IS 'View untuk menampilkan produk dengan estimasi HPP';
COMMENT ON VIEW v_purchase_orders IS 'View untuk menampilkan PO dengan summary item dan supplier info';
