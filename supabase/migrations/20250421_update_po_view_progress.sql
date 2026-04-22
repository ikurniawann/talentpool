-- Update v_purchase_orders view to calculate progress correctly
-- Progress based on qty_received vs qty_ordered from purchase_order_items

DROP VIEW IF EXISTS v_purchase_orders;

CREATE OR REPLACE VIEW v_purchase_orders AS
SELECT 
    po.*,
    s.nama_supplier,
    s.kode as supplier_kode,
    s.pic_name as supplier_pic,
    s.email as supplier_email,
    COALESCE(item_stats.total_items, 0) as total_items,
    COALESCE(item_stats.total_items, 0) as item_count,
    COALESCE(item_stats.total_qty, 0) as total_qty,
    COALESCE(item_stats.total_qty, 0) as total_qty_ordered,
    COALESCE(item_stats.received_qty, 0) as total_qty_received,
    COALESCE(item_stats.total_value, 0) as total_value,
    COALESCE(item_stats.grand_total, 0) as grand_total,
    COALESCE(item_stats.received_items, 0) as received_items,
    -- Calculate progress percentage based on qty_received vs qty_ordered
    CASE 
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100)
    END as progress_pct,
    CASE 
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100)
    END as receive_percentage
FROM purchase_orders po
LEFT JOIN suppliers s ON s.id = po.supplier_id
LEFT JOIN (
    SELECT 
        purchase_order_id,
        COUNT(*) as total_items,
        COALESCE(SUM(qty_ordered), 0) as total_qty,
        COALESCE(SUM(subtotal), 0) as total_value,
        COALESCE(SUM(
            (qty_ordered * harga_satuan) - 
            COALESCE(diskon_item, 0)
        ), 0) as grand_total,
        COALESCE(SUM(CASE WHEN qty_received >= qty_ordered THEN 1 ELSE 0 END), 0) as received_items,
        COALESCE(SUM(qty_received), 0) as received_qty
    FROM purchase_order_items
    WHERE is_active = true
    GROUP BY purchase_order_id
) item_stats ON item_stats.purchase_order_id = po.id
WHERE po.is_active = true;

COMMENT ON VIEW v_purchase_orders IS 'Purchase orders with calculated progress based on received quantities';
