-- ============================================
-- FIX: Add missing columns to purchase_orders
-- ============================================

-- Tambah kolom yang kurang
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS tanggal_kirim_estimasi DATE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Recreate view
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
    po.total as grand_total,
    COALESCE(item_summary.received_items, 0) as received_items
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN (
    SELECT 
        purchase_order_id,
        COUNT(*) as total_items,
        SUM(qty_ordered) as total_qty,
        SUM((qty_ordered * harga_satuan) - COALESCE(diskon_item, 0)) as total_value,
        COUNT(CASE WHEN qty_received >= qty_ordered THEN 1 END) as received_items
    FROM purchase_order_items
    GROUP BY purchase_order_id
) item_summary ON po.id = item_summary.purchase_order_id
WHERE po.is_active = TRUE;
