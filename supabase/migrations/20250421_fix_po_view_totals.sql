-- Fix v_purchase_orders view: hitung subtotal, ppn, grand_total dari items
DROP VIEW IF EXISTS v_purchase_orders;

CREATE OR REPLACE VIEW v_purchase_orders AS
SELECT 
    po.*,
    s.nama_supplier,
    s.kode as supplier_kode,
    s.pic_name as supplier_pic,
    s.email as supplier_email,
    -- Item counts
    COALESCE(item_stats.total_items, 0) as total_items,
    COALESCE(item_stats.total_items, 0) as item_count,
    -- Qty
    COALESCE(item_stats.total_qty, 0) as total_qty,
    COALESCE(item_stats.total_qty, 0) as total_qty_ordered,
    COALESCE(item_stats.received_qty, 0) as total_qty_received,
    -- Harga: hitung dari items (subtotal = sum(qty * harga - diskon_item))
    COALESCE(item_stats.subtotal_items, 0) as subtotal,
    -- Diskon PO level dari kolom po
    COALESCE(po.diskon_nominal, 0) as diskon_nominal,
    COALESCE(po.diskon_persen, 0) as diskon_persen,
    -- PPN dihitung dari (subtotal - diskon)
    CASE 
        WHEN COALESCE(po.ppn_persen, 0) > 0 THEN
            ROUND((COALESCE(item_stats.subtotal_items, 0) - COALESCE(po.diskon_nominal, 0)) * po.ppn_persen / 100)
        ELSE 0
    END as ppn_nominal,
    COALESCE(po.ppn_persen, 0) as ppn_persen,
    -- Grand total = subtotal - diskon + ppn
    COALESCE(item_stats.subtotal_items, 0) 
        - COALESCE(po.diskon_nominal, 0) 
        + CASE 
            WHEN COALESCE(po.ppn_persen, 0) > 0 THEN
                ROUND((COALESCE(item_stats.subtotal_items, 0) - COALESCE(po.diskon_nominal, 0)) * po.ppn_persen / 100)
            ELSE 0
          END as grand_total,
    COALESCE(item_stats.subtotal_items, 0) as total_value,
    COALESCE(item_stats.received_items, 0) as received_items,
    -- Progress percentage
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
        -- Subtotal dari items
        COALESCE(SUM(COALESCE(subtotal, qty_ordered * harga_satuan) - COALESCE(diskon_item, 0)), 0) as subtotal_items,
        -- Received tracking
        COALESCE(SUM(CASE WHEN qty_received >= qty_ordered THEN 1 ELSE 0 END), 0) as received_items,
        COALESCE(SUM(qty_received), 0) as received_qty
    FROM purchase_order_items
    WHERE is_active = true
    GROUP BY purchase_order_id
) item_stats ON item_stats.purchase_order_id = po.id
WHERE po.is_active = true;

COMMENT ON VIEW v_purchase_orders IS 'Purchase orders with calculated totals and progress from items';
