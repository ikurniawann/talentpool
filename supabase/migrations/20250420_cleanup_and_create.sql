-- ============================================
-- CLEANUP & RECREATE: Purchasing Tables
-- ============================================

-- Drop tables if exist (in reverse dependency order)
DROP TABLE IF EXISTS supplier_price_list CASCADE;
DROP TABLE IF EXISTS bom_items CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS raw_materials CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS units CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- 1. TABEL UNITS (Satuan)
CREATE TABLE units (
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
CREATE TABLE raw_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    kategori VARCHAR(30) NOT NULL CHECK (kategori IN (
        'BAHAN_PANGAN', 'BAHAN_NON_PANGAN', 'KEMASAN', 
        'BAHAN_BAKAR', 'LAINNYA'
    )),
    deskripsi TEXT,
    satuan_besar_id UUID REFERENCES units(id),
    satuan_kecil_id UUID REFERENCES units(id),
    konversi_factor DECIMAL(10,4) DEFAULT 1,
    stok_minimum DECIMAL(12,4) DEFAULT 0,
    stok_maximum DECIMAL(12,4) DEFAULT 0,
    shelf_life_days INTEGER,
    storage_condition VARCHAR(20) CHECK (storage_condition IN (
        'SUHU_RUANG', 'DINGIN', 'BEKU', 'KHUSUS'
    )),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- 3. TABEL INVENTORY (Stok Real-time)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id UUID UNIQUE REFERENCES raw_materials(id),
    qty_onhand DECIMAL(12,4) DEFAULT 0,
    qty_reserved DECIMAL(12,4) DEFAULT 0,
    qty_on_order DECIMAL(12,4) DEFAULT 0,
    avg_cost DECIMAL(15,2) DEFAULT 0,
    last_movement_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- 4. TABEL INVENTORY_MOVEMENTS (History Mutasi Stok)
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_material_id UUID REFERENCES raw_materials(id),
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN (
        'IN', 'OUT', 'ADJUSTMENT', 'CONVERSION', 'RETURN'
    )),
    qty DECIMAL(12,4) NOT NULL,
    unit_cost DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    reference_type VARCHAR(30),
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. TABEL PRODUCTS (Master Produk)
CREATE TABLE products (
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
CREATE TABLE bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials(id),
    qty_required DECIMAL(12,4) NOT NULL,
    satuan_id UUID REFERENCES units(id),
    waste_factor DECIMAL(5,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL SUPPLIERS
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama_supplier VARCHAR(200) NOT NULL,
    pic_name VARCHAR(100),
    pic_phone VARCHAR(30),
    email VARCHAR(100),
    alamat TEXT,
    kota VARCHAR(100),
    npwp VARCHAR(50),
    payment_terms VARCHAR(20) DEFAULT 'NET30',
    currency VARCHAR(3) DEFAULT 'IDR',
    bank_nama VARCHAR(100),
    bank_rekening VARCHAR(50),
    bank_atas_nama VARCHAR(100),
    kategori VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 8. TABEL SUPPLIER_PRICE_LIST
CREATE TABLE supplier_price_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
    harga DECIMAL(15,2) NOT NULL,
    satuan_id UUID REFERENCES units(id),
    min_qty DECIMAL(12,4) DEFAULT 1,
    lead_time_days INTEGER DEFAULT 0,
    is_preferred BOOLEAN DEFAULT FALSE,
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

CREATE INDEX idx_raw_materials_kategori ON raw_materials(kategori);
CREATE INDEX idx_raw_materials_is_active ON raw_materials(is_active);
CREATE INDEX idx_raw_materials_deleted ON raw_materials(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_inventory_material ON inventory(raw_material_id);

CREATE INDEX idx_inv_movements_material ON inventory_movements(raw_material_id);
CREATE INDEX idx_inv_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inv_movements_created ON inventory_movements(created_at);

CREATE INDEX idx_bom_product ON bom_items(product_id);
CREATE INDEX idx_bom_material ON bom_items(raw_material_id);

CREATE INDEX idx_price_supplier ON supplier_price_list(supplier_id);
CREATE INDEX idx_price_material ON supplier_price_list(raw_material_id);
CREATE INDEX idx_price_preferred ON supplier_price_list(is_preferred);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
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

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow all" ON units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON raw_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON bom_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON supplier_price_list FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO units (kode, nama, tipe) VALUES
('KG', 'Kilogram', 'BESAR'),
('GR', 'Gram', 'KECIL'),
('LT', 'Liter', 'BESAR'),
('ML', 'Milliliter', 'KECIL'),
('PC', 'Pieces', 'BESAR'),
('BOX', 'Box', 'BESAR'),
('SAK', 'Sak', 'BESAR');
