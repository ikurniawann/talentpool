-- ============================================
-- GRN (Goods Receipt Note) Tables
-- ============================================

-- 1. TABEL GRN (Header)
CREATE TABLE IF NOT EXISTS grn (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_grn VARCHAR(100) UNIQUE NOT NULL,
    delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    tanggal_penerimaan DATE NOT NULL DEFAULT CURRENT_DATE,
    penerima_id UUID REFERENCES users(id) ON DELETE SET NULL,
    no_surat_jalan VARCHAR(100),
    catatan TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'partially_received', 'received', 'rejected')),
    total_item_diterima INTEGER DEFAULT 0,
    total_item_ditolak INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABEL GRN_ITEMS (Detail Penerimaan)
CREATE TABLE IF NOT EXISTS grn_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
    delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
    purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
    raw_material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE RESTRICT,
    qty_diterima DECIMAL(12,4) NOT NULL DEFAULT 0,
    qty_ditolak DECIMAL(12,4) NOT NULL DEFAULT 0,
    satuan_id UUID REFERENCES units(id) ON DELETE SET NULL,
    kondisi VARCHAR(20) CHECK (kondisi IN ('baik', 'rusak', 'cacat')),
    catatan TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_grn_delivery_id ON grn(delivery_id);
CREATE INDEX IF NOT EXISTS idx_grn_po_id ON grn(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_grn_supplier_id ON grn(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_status ON grn(status);
CREATE INDEX IF NOT EXISTS idx_grn_nomor_grn ON grn(nomor_grn);
CREATE INDEX IF NOT EXISTS idx_grn_is_active ON grn(is_active);
CREATE INDEX IF NOT EXISTS idx_grn_tanggal ON grn(tanggal_penerimaan);

CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_raw_material ON grn_items(raw_material_id);

-- 4. RLS POLICIES
ALTER TABLE grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow select for warehouse and purchasing roles
CREATE POLICY "Enable read access for warehouse and purchasing"
ON grn
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('warehouse_staff', 'warehouse_admin', 'purchasing_admin', 'purchasing_staff', 'qc_staff', 'admin')
  )
);

CREATE POLICY "Enable read access for warehouse and purchasing"
ON grn_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('warehouse_staff', 'warehouse_admin', 'purchasing_admin', 'purchasing_staff', 'qc_staff', 'admin')
  )
);

-- Policy: Allow insert for warehouse and purchasing roles
CREATE POLICY "Enable insert for warehouse and purchasing"
ON grn
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('warehouse_staff', 'warehouse_admin', 'purchasing_admin', 'purchasing_staff', 'admin')
  )
);

CREATE POLICY "Enable insert for warehouse and purchasing"
ON grn_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('warehouse_staff', 'warehouse_admin', 'purchasing_admin', 'purchasing_staff', 'admin')
  )
);

-- Policy: Allow update for warehouse and purchasing roles
CREATE POLICY "Enable update for warehouse and purchasing"
ON grn
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('warehouse_staff', 'warehouse_admin', 'purchasing_admin', 'purchasing_staff', 'qc_staff', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('warehouse_staff', 'warehouse_admin', 'purchasing_admin', 'purchasing_staff', 'qc_staff', 'admin')
  )
);

CREATE POLICY "Enable update for warehouse and purchasing"
ON grn_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('warehouse_staff', 'warehouse_admin', 'purchasing_admin', 'purchasing_staff', 'qc_staff', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('warehouse_staff', 'warehouse_admin', 'purchasing_admin', 'purchasing_staff', 'qc_staff', 'admin')
  )
);

-- 5. TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_grn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_grn_updated_at ON grn;
CREATE TRIGGER update_grn_updated_at
    BEFORE UPDATE ON grn
    FOR EACH ROW
    EXECUTE FUNCTION update_grn_updated_at();

DROP TRIGGER IF EXISTS update_grn_items_updated_at ON grn_items;
CREATE TRIGGER update_grn_items_updated_at
    BEFORE UPDATE ON grn_items
    FOR EACH ROW
    EXECUTE FUNCTION update_grn_updated_at();
