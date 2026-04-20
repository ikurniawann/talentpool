-- ============================================
-- FIX: Add missing column and recreate view (SAFE VERSION)
-- ============================================

-- 1. Tambah kolom yang kurang di tabel
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS tanggal_kirim_estimasi DATE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Cek kolom yang ada di tabel purchase_orders
-- Kolom wajib: id, nomor_po, supplier_id, tanggal_po, status, subtotal, diskon_persen, diskon_nominal, ppn_persen, ppn_nominal, total, catatan, alamat_pengiriman, is_active, created_at, updated_at

-- 3. Drop view lama
DROP VIEW IF EXISTS v_purchase_orders;

-- 4. Recreate view dengan kolom yang sudah pasti ada
CREATE VIEW v_purchase_orders AS
SELECT 
    po.id,
    po.nomor_po,
    po.supplier_id,
    po.tanggal_po,
    po.tanggal_kirim_estimasi,
    po.status,
    po.subtotal,
    po.diskon_persen,
    po.diskon_nominal,
    po.ppn_persen,
    po.ppn_nominal,
    po.total,
    po.catatan,
    po.alamat_pengiriman,
    po.is_active,
    po.created_at,
    po.updated_at,
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
