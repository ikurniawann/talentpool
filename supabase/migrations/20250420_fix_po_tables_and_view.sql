-- ============================================
-- FIX: Create PO tables and view
-- ============================================

-- 1. TABEL PURCHASE_ORDERS (Header PO)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_po VARCHAR(30) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    tanggal_po DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_kirim_estimasi DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'APPROVED', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED')),
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    diskon_persen DECIMAL(5,2) DEFAULT 0,
    diskon_nominal DECIMAL(15,2) DEFAULT 0,
    ppn_persen DECIMAL(5,2) DEFAULT 11,
    ppn_nominal DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    catatan TEXT,
    alamat_pengiriman TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ,
    sent_via VARCHAR(20) CHECK (sent_via IN ('EMAIL', 'WHATSAPP', 'PRINT', 'OTHER')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id),
    cancellation_reason TEXT,
    deleted_at TIMESTAMPTZ
);

-- 2. TABEL PURCHASE_ORDER_ITEMS (Line Items)
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    qty_ordered DECIMAL(12,4) NOT NULL,
    qty_received DECIMAL(12,4) DEFAULT 0,
    qty_remaining DECIMAL(12,4) GENERATED ALWAYS AS (qty_ordered - qty_received) STORED,
    satuan_id UUID REFERENCES units(id),
    harga_satuan DECIMAL(15,2) NOT NULL,
    diskon_item DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) GENERATED ALWAYS AS ((qty_ordered * harga_satuan) - diskon_item) STORED,
    catatan TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VIEW v_purchase_orders (FIXED - tanpa grand_total dari subquery)
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
WHERE po.deleted_at IS NULL;
