-- ============================================
-- MIGRATION: Purchasing Purchase Order (Fase 2)
-- Created: 2026-04-20
-- ============================================

-- 1. TABEL PURCHASE_ORDERS (Header PO)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_po VARCHAR(30) UNIQUE NOT NULL,
    
    -- Supplier info
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    
    -- Tanggal
    tanggal_po DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_kirim_estimasi DATE,
    
    -- Status workflow
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'APPROVED', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED')),
    
    -- Financials
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    diskon_persen DECIMAL(5,2) DEFAULT 0,
    diskon_nominal DECIMAL(15,2) DEFAULT 0,
    ppn_persen DECIMAL(5,2) DEFAULT 11,
    ppn_nominal DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Additional info
    catatan TEXT,
    alamat_pengiriman TEXT,
    
    -- Approval & tracking
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    sent_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ,
    sent_via VARCHAR(20) CHECK (sent_via IN ('EMAIL', 'WHATSAPP', 'PRINT', 'OTHER')),
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES auth.users(id),
    cancellation_reason TEXT
);

-- 2. TABEL PURCHASE_ORDER_ITEMS (Line Items)
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    
    -- Material
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
    
    -- Quantity
    qty_ordered DECIMAL(12,4) NOT NULL,
    qty_received DECIMAL(12,4) DEFAULT 0,
    qty_remaining DECIMAL(12,4) GENERATED ALWAYS AS (qty_ordered - qty_received) STORED,
    
    -- Unit & Price
    satuan_id UUID REFERENCES units(id),
    harga_satuan DECIMAL(15,2) NOT NULL,
    diskon_item DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) GENERATED ALWAYS AS (
        (qty_ordered * harga_satuan) - diskon_item
    ) STORED,
    
    -- Notes
    catatan TEXT,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_tanggal ON purchase_orders(tanggal_po);
CREATE INDEX IF NOT EXISTS idx_po_nomor ON purchase_orders(nomor_po);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_material ON purchase_order_items(raw_material_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-generate nomor PO
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year_month := 'PO-' || TO_CHAR(NOW(), 'YYYYMM') || '-';
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_po FROM LENGTH(year_month) + 1) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM purchase_orders
    WHERE nomor_po LIKE year_month || '%';
    
    new_number := year_month || LPAD(sequence_num::TEXT, 4, '0');
    NEW.nomor_po := new_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.nomor_po IS NULL OR NEW.nomor_po = '') 
    EXECUTE FUNCTION generate_po_number();

-- Update PO totals when items change
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
DECLARE
    po_id UUID;
    new_subtotal DECIMAL(15,2);
    diskon_nom DECIMAL(15,2);
    ppn_nom DECIMAL(15,2);
    total_final DECIMAL(15,2);
BEGIN
    -- Determine which PO to update
    IF TG_OP = 'DELETE' THEN
        po_id := OLD.purchase_order_id;
    ELSE
        po_id := NEW.purchase_order_id;
    END IF;
    
    -- Calculate subtotal from all active items
    SELECT COALESCE(SUM(subtotal), 0)
    INTO new_subtotal
    FROM purchase_order_items
    WHERE purchase_order_id = po_id AND is_active = TRUE;
    
    -- Get PO discount settings
    SELECT diskon_persen, diskon_nominal, ppn_persen
    INTO diskon_nom, diskon_nom, ppn_nom
    FROM purchase_orders
    WHERE id = po_id;
    
    -- Recalculate
    diskon_nom := LEAST(
        COALESCE((SELECT diskon_nominal FROM purchase_orders WHERE id = po_id), 0),
        new_subtotal * COALESCE((SELECT diskon_persen FROM purchase_orders WHERE id = po_id), 0) / 100
    );
    
    ppn_nom := (new_subtotal - diskon_nom) * COALESCE((SELECT ppn_persen FROM purchase_orders WHERE id = po_id), 11) / 100;
    total_final := new_subtotal - diskon_nom + ppn_nom;
    
    -- Update PO
    UPDATE purchase_orders
    SET subtotal = new_subtotal,
        diskon_nominal = diskon_nom,
        ppn_nominal = ppn_nom,
        total = total_final,
        updated_at = NOW()
    WHERE id = po_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_po_totals
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_totals();

-- Function: Update PO status when items received
CREATE OR REPLACE FUNCTION update_po_status_on_receive()
RETURNS TRIGGER AS $$
DECLARE
    total_ordered DECIMAL(12,4);
    total_received DECIMAL(12,4);
    po_status VARCHAR(20);
BEGIN
    SELECT status INTO po_status
    FROM purchase_orders
    WHERE id = NEW.purchase_order_id;
    
    IF po_status = 'CANCELLED' THEN
        RETURN NEW;
    END IF;
    
    SELECT COALESCE(SUM(qty_ordered), 0), COALESCE(SUM(qty_received), 0)
    INTO total_ordered, total_received
    FROM purchase_order_items
    WHERE purchase_order_id = NEW.purchase_order_id AND is_active = TRUE;
    
    IF total_received >= total_ordered THEN
        UPDATE purchase_orders
        SET status = 'RECEIVED',
            updated_at = NOW()
        WHERE id = NEW.purchase_order_id;
    ELSIF total_received > 0 THEN
        UPDATE purchase_orders
        SET status = 'PARTIAL',
            updated_at = NOW()
        WHERE id = NEW.purchase_order_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- View: Purchase Orders dengan info lengkap
CREATE OR REPLACE VIEW v_purchase_orders AS
SELECT 
    po.*,
    s.nama_supplier,
    s.kode as supplier_kode,
    COALESCE(
        (SELECT COUNT(*) 
         FROM purchase_order_items 
         WHERE purchase_order_id = po.id AND is_active = TRUE),
        0
    ) as item_count,
    COALESCE(
        (SELECT SUM(qty_ordered)
         FROM purchase_order_items 
         WHERE purchase_order_id = po.id AND is_active = TRUE),
        0
    ) as total_qty_ordered,
    COALESCE(
        (SELECT SUM(qty_received)
         FROM purchase_order_items 
         WHERE purchase_order_id = po.id AND is_active = TRUE),
        0
    ) as total_qty_received,
    CASE 
        WHEN po.total_qty_ordered > 0 
        THEN ROUND((po.total_qty_received / po.total_qty_ordered * 100), 2)
        ELSE 0 
    END as receive_percentage
FROM purchase_orders po
LEFT JOIN suppliers s ON po.supplier_id = s.id
WHERE po.is_active = TRUE;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON purchase_order_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE purchase_orders IS 'Header Purchase Order';
COMMENT ON TABLE purchase_order_items IS 'Line items Purchase Order';
COMMENT ON COLUMN purchase_orders.status IS 'DRAFT, APPROVED, SENT, PARTIAL, RECEIVED, CANCELLED';
