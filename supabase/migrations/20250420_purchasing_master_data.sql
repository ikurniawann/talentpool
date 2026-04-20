-- ============================================
-- MIGRATION: Purchasing Master Data
-- Created: 2026-04-20
-- ============================================

-- 1. TABEL UNITS (Satuan)
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(10) UNIQUE NOT NULL,
    nama VARCHAR(50) NOT NULL,
    tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('BESAR', 'KECIL', 'KONVERSI')),
    deskripsi TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. TABEL RAW_MATERIALS (Bahan Baku)
CREATE TABLE IF NOT EXISTS raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    kategori VARCHAR(30) NOT NULL CHECK (kategori IN (
        'BAHAN_PANGAN', 'BAHAN_NON_PANGAN', 'KEMASAN', 
        'BAHAN_BAKAR', 'LAINNYA'
    )),
    deskripsi TEXT,
    
    -- Satuan
    satuan_besar_id UUID REFERENCES units(id),
    satuan_kecil_id UUID REFERENCES units(id),
    konversi_factor DECIMAL(10,4) DEFAULT 1, -- 1 satuan besar = X satuan kecil
    
    -- Stok settings
    stok_minimum DECIMAL(12,4) DEFAULT 0,
    stok_maximum DECIMAL(12,4) DEFAULT 0,
    shelf_life_days INTEGER,
    storage_condition VARCHAR(20) CHECK (storage_condition IN (
        'SUHU_RUANG', 'DINGIN', 'BEKU', 'KHUSUS'
    )),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- 3. TABEL INVENTORY (Stok Real-time)
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id UUID UNIQUE REFERENCES raw_materials(id),
    qty_onhand DECIMAL(12,4) DEFAULT 0,       -- Stok fisik tersedia
    qty_reserved DECIMAL(12,4) DEFAULT 0,    -- Stok dipesan/terjadwal
    qty_on_order DECIMAL(12,4) DEFAULT 0,    -- Stok dalam perjalanan (PO)
    avg_cost DECIMAL(15,2) DEFAULT 0,        -- Harga rata-rata
    last_movement_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 4. TABEL INVENTORY_MOVEMENTS (History Mutasi Stok)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id UUID REFERENCES raw_materials(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN (
        'IN', 'OUT', 'ADJUSTMENT', 'CONVERSION', 'RETURN'
    )),
    qty DECIMAL(12,4) NOT NULL,              -- Positif untuk IN, negatif untuk OUT
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    reference_type VARCHAR(30),              -- PO, GRN, ADJUSTMENT, etc
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. TABEL PRODUCTS (Master Produk)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    kategori VARCHAR(30),
    satuan_id UUID REFERENCES units(id),
    harga_jual DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- 6. TABEL BOM (Bill of Materials)
CREATE TABLE IF NOT EXISTS bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials(id),
    qty_required DECIMAL(12,4) NOT NULL,   -- Jumlah bahan per 1 unit produk
    satuan_id UUID REFERENCES units(id),     -- Satuan penggunaan
    waste_factor DECIMAL(5,4) DEFAULT 0,     -- Faktor waste/loss (%)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL SUPPLIER_PRICE_LIST (Harga Beli per Supplier)
CREATE TABLE IF NOT EXISTS supplier_price_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    harga DECIMAL(15,2) NOT NULL,
    satuan_id UUID REFERENCES units(id),    -- Satuan harga (biasanya satuan besar)
    min_qty DECIMAL(12,4) DEFAULT 1,          -- Minimum order quantity
    lead_time_days INTEGER DEFAULT 0,       -- Waktu pengiriman estimasi
    is_preferred BOOLEAN DEFAULT FALSE,       -- Supplier utama untuk bahan ini
    is_active BOOLEAN DEFAULT TRUE,
    berlaku_mulai DATE DEFAULT CURRENT_DATE,
    berlaku_sampai DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(supplier_id, raw_material_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_raw_materials_kategori ON raw_materials(kategori);
CREATE INDEX IF NOT EXISTS idx_raw_materials_is_active ON raw_materials(is_active);
CREATE INDEX IF NOT EXISTS idx_raw_materials_deleted ON raw_materials(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_material ON inventory(raw_material_id);

CREATE INDEX IF NOT EXISTS idx_inv_movements_material ON inventory_movements(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inv_movements_created ON inventory_movements(created_at);

CREATE INDEX IF NOT EXISTS idx_bom_product ON bom_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_material ON bom_items(raw_material_id);

CREATE INDEX IF NOT EXISTS idx_price_supplier ON supplier_price_list(supplier_id);
CREATE INDEX IF NOT EXISTS idx_price_material ON supplier_price_list(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_price_preferred ON supplier_price_list(is_preferred);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk updated_at
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    
CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON raw_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    
CREATE TRIGGER update_bom_items_updated_at BEFORE UPDATE ON bom_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    
CREATE TRIGGER update_supplier_price_list_updated_at BEFORE UPDATE ON supplier_price_list
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: Generate kode bahan baku otomatis
CREATE OR REPLACE FUNCTION generate_material_code()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    sequence_num INTEGER;
    new_code TEXT;
BEGIN
    year_prefix := 'BHN-' || TO_CHAR(NOW(), 'YYYY') || '-';
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(kode FROM LENGTH(year_prefix) + 1) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM raw_materials
    WHERE kode LIKE year_prefix || '%';
    
    new_code := year_prefix || LPAD(sequence_num::TEXT, 4, '0');
    NEW.kode := new_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_material_code
    BEFORE INSERT ON raw_materials
    FOR EACH ROW
    WHEN (NEW.kode IS NULL OR NEW.kode = '') 
    EXECUTE FUNCTION generate_material_code();

-- Function: Generate kode produk otomatis
CREATE OR REPLACE FUNCTION generate_product_code()
RETURNS TRIGGER AS $$
DECLARE
    year_prefix TEXT;
    sequence_num INTEGER;
    new_code TEXT;
BEGIN
    year_prefix := 'PRD-' || TO_CHAR(NOW(), 'YYYY') || '-';
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(kode FROM LENGTH(year_prefix) + 1) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM products
    WHERE kode LIKE year_prefix || '%';
    
    new_code := year_prefix || LPAD(sequence_num::TEXT, 4, '0');
    NEW.kode := new_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_product_code
    BEFORE INSERT ON products
    FOR EACH ROW
    WHEN (NEW.kode IS NULL OR NEW.kode = '') 
    EXECUTE FUNCTION generate_product_code();

-- Function: Auto-create inventory record when raw material created
CREATE OR REPLACE FUNCTION create_inventory_record()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory (raw_material_id, qty_onhand, qty_reserved, qty_on_order, avg_cost)
    VALUES (NEW.id, 0, 0, 0, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_inventory
    AFTER INSERT ON raw_materials
    FOR EACH ROW
    EXECUTE FUNCTION create_inventory_record();

-- Function: Calculate stock status (AMAN/MENIPIS/HABIS)
CREATE OR REPLACE FUNCTION get_stock_status(
    p_onhand DECIMAL,
    p_minimum DECIMAL
) RETURNS TEXT AS $$
BEGIN
    IF p_onhand <= 0 THEN
        RETURN 'HABIS';
    ELSIF p_onhand <= p_minimum THEN
        RETURN 'MENIPIS';
    ELSE
        RETURN 'AMAN';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- VIEWS
-- ============================================

-- View: Raw Materials dengan info stok
CREATE OR REPLACE VIEW v_raw_materials_stock AS
SELECT 
    rm.*,
    u1.nama as satuan_besar_nama,
    u2.nama as satuan_kecil_nama,
    i.qty_onhand,
    i.qty_reserved,
    i.qty_on_order,
    i.avg_cost,
    get_stock_status(i.qty_onhand, rm.stok_minimum) as status_stok
FROM raw_materials rm
LEFT JOIN units u1 ON rm.satuan_besar_id = u1.id
LEFT JOIN units u2 ON rm.satuan_kecil_id = u2.id
LEFT JOIN inventory i ON rm.id = i.raw_material_id
WHERE rm.deleted_at IS NULL AND rm.is_active = TRUE;

-- View: Products dengan HPP
CREATE OR REPLACE VIEW v_products_cogs AS
SELECT 
    p.*,
    u.nama as satuan_nama,
    COALESCE(
        (SELECT SUM(bi.qty_required * rm.avg_cost)
         FROM bom_items bi
         JOIN raw_materials rm ON bi.raw_material_id = rm.id
         WHERE bi.product_id = p.id AND bi.is_active = TRUE),
        0
    ) as hpp_estimasi
FROM products p
LEFT JOIN units u ON p.satuan_id = u.id
WHERE p.deleted_at IS NULL AND p.is_active = TRUE;

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Enable RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_list ENABLE ROW LEVEL SECURITY;

-- Policies (read-only for now - akan diupdate setelah auth setup)
CREATE POLICY "Allow all" ON units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON raw_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON bom_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON supplier_price_list FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE units IS 'Master satuan (kg, gram, sak, dll)';
COMMENT ON TABLE raw_materials IS 'Master bahan baku';
COMMENT ON TABLE inventory IS 'Stok real-time per bahan baku';
COMMENT ON TABLE inventory_movements IS 'History pergerakan stok';
COMMENT ON TABLE products IS 'Master produk jadi';
COMMENT ON TABLE bom_items IS 'Komposisi bahan per produk (Bill of Materials)';
COMMENT ON TABLE supplier_price_list IS 'Harga beli bahan dari supplier';
