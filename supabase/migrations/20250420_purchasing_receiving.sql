-- ============================================
-- FASE 3: PENGIRIMAN & PENERIMAAN (Receiving)
-- ============================================

-- ============================================
-- 1. DELIVERY (Pengiriman dari Supplier)
-- ============================================
CREATE TABLE IF NOT EXISTS purchasing.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_delivery TEXT NOT NULL UNIQUE,
    po_id UUID NOT NULL REFERENCES purchasing.purchase_orders(id),
    supplier_id UUID NOT NULL REFERENCES purchasing.suppliers(id),
    
    -- Tanggal
    tanggal_kirim DATE,
    tanggal_estimasi_tiba DATE,
    tanggal_aktual_tiba DATE,
    
    -- Kurir/Forwarder
    kurir TEXT,
    nomor_resi TEXT,
    
    -- Status
    status TEXT DEFAULT 'IN_TRANSIT' CHECK (status IN ('IN_TRANSIT', 'ARRIVED', 'RECEIVED', 'CANCELLED')),
    
    -- Catatan
    catatan TEXT,
    
    -- Tracking
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. GOODS RECEIPT (Penerimaan Barang - GRN)
-- ============================================
CREATE TABLE IF NOT EXISTS purchasing.goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_grn TEXT NOT NULL UNIQUE,
    
    -- Links
    po_id UUID NOT NULL REFERENCES purchasing.purchase_orders(id),
    delivery_id UUID REFERENCES purchasing.deliveries(id),
    
    -- Penerima
    received_by UUID REFERENCES auth.users(id),
    received_at TIMESTAMPTZ DEFAULT now(),
    
    -- Detail Penerimaan
    gudang_tujuan TEXT DEFAULT 'GUDANG UTAMA',
    kondisi_packing TEXT CHECK (kondisi_packing IN ('BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT')),
    
    -- Status
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'QC_PENDING', 'QC_APPROVED', 'QC_REJECTED', 'COMPLETED')),
    
    -- Catatan
    catatan_penerimaan TEXT,
    
    -- Total
    total_qty_received NUMERIC(15,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. GOODS RECEIPT ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS purchasing.goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID NOT NULL REFERENCES purchasing.goods_receipts(id) ON DELETE CASCADE,
    po_item_id UUID NOT NULL REFERENCES purchasing.purchase_order_items(id),
    raw_material_id UUID NOT NULL REFERENCES purchasing.raw_materials(id),
    
    -- Jumlah
    qty_diterima NUMERIC(15,4) NOT NULL CHECK (qty_diterima >= 0),
    qty_diterima_baik NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (qty_diterima_baik >= 0),
    qty_cacat NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (qty_cacat >= 0),
    
    -- Satuan
    satuan_id UUID REFERENCES purchasing.units(id),
    
    -- Harga (snapshot dari PO)
    harga_satuan NUMERIC(15,2),
    
    -- Lokasi
    lokasi_rak TEXT,
    
    -- Catatan
    catatan TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. QUALITY CONTROL (QC)
-- ============================================
CREATE TABLE IF NOT EXISTS purchasing.qc_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID NOT NULL REFERENCES purchasing.goods_receipts(id),
    
    -- Inspector
    inspected_by UUID REFERENCES auth.users(id),
    inspected_at TIMESTAMPTZ DEFAULT now(),
    
    -- Status
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PARTIAL')),
    
    -- Hasil Pemeriksaan
    parameter_inspeksi TEXT[], -- Contoh: ['Kemasan', 'Warna', 'Tekstur', 'Expired']
    hasil_inspeksi JSONB, -- {"Kemasan": "OK", "Warna": "NG", ...}
    
    -- Sample
    qty_sample NUMERIC(15,4),
    qty_sample_diterima NUMERIC(15,4),
    qty_sample_ditolak NUMERIC(15,4),
    
    -- Dokumen
    foto_qc TEXT[], -- URL foto
    dokumen_lain TEXT[],
    
    -- Catatan
    catatan_qc TEXT,
    rekomendasi TEXT, -- 'ACCEPT', 'REJECT', 'REWORK'
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. RETURNS (Pengembalian Barang)
-- ============================================
CREATE TABLE IF NOT EXISTS purchasing.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_return TEXT NOT NULL UNIQUE,
    
    -- Links
    grn_id UUID NOT NULL REFERENCES purchasing.goods_receipts(id),
    po_id UUID NOT NULL REFERENCES purchasing.purchase_orders(id),
    supplier_id UUID NOT NULL REFERENCES purchasing.suppliers(id),
    
    -- Status
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'RECEIVED_BY_SUPPLIER', 'REPLACEMENT_SENT', 'REFUNDED', 'CANCELLED')),
    
    -- Detail Return
    tanggal_return DATE DEFAULT CURRENT_DATE,
    alasan_return TEXT NOT NULL, -- 'CACAT', 'KADALUARSA', 'SALAH_KIRIM', 'KELEBIHAN', 'LAINNYA'
    keterangan TEXT,
    
    -- Resolusi
    jenis_resolusi TEXT, -- 'REPLACEMENT', 'REFUND', 'CREDIT_NOTE'
    nomor_referensi_resolusi TEXT,
    
    -- Total
    total_qty_return NUMERIC(15,4) DEFAULT 0,
    total_nilai_return NUMERIC(15,2) DEFAULT 0,
    
    -- Tracking
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchasing.return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES purchasing.returns(id) ON DELETE CASCADE,
    grn_item_id UUID NOT NULL REFERENCES purchasing.goods_receipt_items(id),
    raw_material_id UUID NOT NULL REFERENCES purchasing.raw_materials(id),
    
    -- Jumlah
    qty_return NUMERIC(15,4) NOT NULL CHECK (qty_return > 0),
    
    -- Harga (snapshot)
    harga_satuan NUMERIC(15,2),
    nilai_return NUMERIC(15,2), -- qty_return * harga_satuan
    
    -- Alasan spesifik
    alasan_item TEXT,
    
    -- Dokumen
    foto_bukti TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_deliveries_po ON purchasing.deliveries(po_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON purchasing.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_tanggal ON purchasing.deliveries(tanggal_estimasi_tiba);

CREATE INDEX IF NOT EXISTS idx_grn_po ON purchasing.goods_receipts(po_id);
CREATE INDEX IF NOT EXISTS idx_grn_delivery ON purchasing.goods_receipts(delivery_id);
CREATE INDEX IF NOT EXISTS idx_grn_status ON purchasing.goods_receipts(status);

CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON purchasing.goods_receipt_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_material ON purchasing.goods_receipt_items(raw_material_id);

CREATE INDEX IF NOT EXISTS idx_qc_grn ON purchasing.qc_inspections(grn_id);

CREATE INDEX IF NOT EXISTS idx_returns_grn ON purchasing.returns(grn_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON purchasing.returns(status);

-- ============================================
-- FUNCTIONS: AUTO GENERATE NOMOR
-- ============================================
CREATE OR REPLACE FUNCTION purchasing.generate_delivery_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(NULLIF(regexp_replace(nomor_delivery, '^DLV-' || year || '-', ''), '')), '0')::INTEGER
    INTO sequence_num
    FROM purchasing.deliveries
    WHERE nomor_delivery LIKE 'DLV-' || year || '-%';
    
    sequence_num := sequence_num + 1;
    new_number := 'DLV-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION purchasing.generate_grn_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(NULLIF(regexp_replace(nomor_grn, '^GRN-' || year || '-', ''), '')), '0')::INTEGER
    INTO sequence_num
    FROM purchasing.goods_receipts
    WHERE nomor_grn LIKE 'GRN-' || year || '-%';
    
    sequence_num := sequence_num + 1;
    new_number := 'GRN-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION purchasing.generate_return_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(NULLIF(regexp_replace(nomor_return, '^RET-' || year || '-', ''), '')), '0')::INTEGER
    INTO sequence_num
    FROM purchasing.returns
    WHERE nomor_return LIKE 'RET-' || year || '-%';
    
    sequence_num := sequence_num + 1;
    new_number := 'RET-' || year || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: UPDATE PO STATUS ON GRN
-- ============================================
CREATE OR REPLACE FUNCTION purchasing.update_po_status_on_grn()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id UUID;
    v_total_ordered NUMERIC;
    v_total_received NUMERIC;
BEGIN
    -- Get PO ID
    SELECT po_id INTO v_po_id FROM purchasing.goods_receipts WHERE id = NEW.grn_id;
    
    -- Calculate totals
    SELECT 
        COALESCE(SUM(qty_ordered), 0),
        COALESCE(SUM(qty_received), 0)
    INTO v_total_ordered, v_total_received
    FROM purchasing.purchase_order_items
    WHERE po_id = v_po_id;
    
    -- Update PO status
    IF v_total_received >= v_total_ordered THEN
        UPDATE purchasing.purchase_orders 
        SET status = 'RECEIVED', updated_at = now()
        WHERE id = v_po_id;
    ELSIF v_total_received > 0 THEN
        UPDATE purchasing.purchase_orders 
        SET status = 'PARTIAL', updated_at = now()
        WHERE id = v_po_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update PO status
DROP TRIGGER IF EXISTS trg_update_po_on_grn ON purchasing.goods_receipt_items;
CREATE TRIGGER trg_update_po_on_grn
    AFTER INSERT OR UPDATE ON purchasing.goods_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION purchasing.update_po_status_on_grn();

-- ============================================
-- FUNCTION: AUTO UPDATE INVENTORY ON GRN
-- ============================================
CREATE OR REPLACE FUNCTION purchasing.update_inventory_on_grn()
RETURNS TRIGGER AS $$
DECLARE
    v_grn_status TEXT;
    v_po_id UUID;
BEGIN
    -- Get GRN status
    SELECT status, po_id INTO v_grn_status, v_po_id
    FROM purchasing.goods_receipts 
    WHERE id = NEW.grn_id;
    
    -- Only update inventory if QC approved or completed
    IF v_grn_status IN ('QC_APPROVED', 'COMPLETED') THEN
        -- Update inventory quantity
        UPDATE purchasing.inventory
        SET 
            qty_available = qty_available + NEW.qty_diterima_baik,
            updated_at = now()
        WHERE raw_material_id = NEW.raw_material_id;
        
        -- Create inventory movement
        INSERT INTO purchasing.inventory_movements (
            raw_material_id,
            movement_type,
            qty_in,
            qty_out,
            qty_after,
            reference_type,
            reference_id,
            reference_no,
            notes
        )
        SELECT 
            NEW.raw_material_id,
            'IN',
            NEW.qty_diterima_baik,
            0,
            i.qty_available,
            'GOODS_RECEIPT',
            NEW.grn_id,
            gr.nomor_grn,
            'Penerimaan dari PO'
        FROM purchasing.inventory i
        JOIN purchasing.goods_receipts gr ON gr.id = NEW.grn_id
        WHERE i.raw_material_id = NEW.raw_material_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for inventory update
DROP TRIGGER IF EXISTS trg_update_inventory_grn ON purchasing.goods_receipt_items;
CREATE TRIGGER trg_update_inventory_grn
    AFTER INSERT ON purchasing.goods_receipt_items
    FOR EACH ROW
    EXECUTE FUNCTION purchasing.update_inventory_on_grn();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================
ALTER TABLE purchasing.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing.goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchasing.return_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all" ON purchasing.deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all" ON purchasing.goods_receipts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all" ON purchasing.goods_receipt_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all" ON purchasing.qc_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all" ON purchasing.returns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all" ON purchasing.return_items FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- VIEWS
-- ============================================

-- View: Delivery dengan PO info
CREATE OR REPLACE VIEW purchasing.v_deliveries AS
SELECT 
    d.*,
    po.nomor_po,
    po.status as po_status,
    s.nama_supplier,
    s.kode as supplier_kode
FROM purchasing.deliveries d
JOIN purchasing.purchase_orders po ON po.id = d.po_id
JOIN purchasing.suppliers s ON s.id = d.supplier_id;

-- View: GRN lengkap
CREATE OR REPLACE VIEW purchasing.v_goods_receipts AS
SELECT 
    gr.*,
    po.nomor_po,
    d.nomor_delivery,
    s.nama_supplier,
    s.kode as supplier_kode,
    u.email as receiver_email
FROM purchasing.goods_receipts gr
JOIN purchasing.purchase_orders po ON po.id = gr.po_id
LEFT JOIN purchasing.deliveries d ON d.id = gr.delivery_id
JOIN purchasing.suppliers s ON s.id = po.supplier_id
LEFT JOIN auth.users u ON u.id = gr.received_by;

-- View: GRN Items lengkap
CREATE OR REPLACE VIEW purchasing.v_grn_items AS
SELECT 
    gri.*,
    rm.nama as material_nama,
    rm.kode as material_kode,
    u.nama as satuan_nama,
    gr.nomor_grn
FROM purchasing.goods_receipt_items gri
JOIN purchasing.raw_materials rm ON rm.id = gri.raw_material_id
LEFT JOIN purchasing.units u ON u.id = gri.satuan_id
JOIN purchasing.goods_receipts gr ON gr.id = gri.grn_id;