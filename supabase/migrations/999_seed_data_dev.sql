-- ============================================================
-- SEED DATA - Master Data Asal (untuk development)
-- ============================================================

-- 1. SATUAN (Units)
INSERT INTO satuan (kode, nama, deskripsi) VALUES
  ('PCS', 'Pieces', 'Satuan pieces/pcs'),
  ('BOX', 'Box', 'Satuan box'),
  ('KG', 'Kilogram', 'Satuan berat kilogram'),
  ('GRAM', 'Gram', 'Satuan berat gram'),
  ('LITER', 'Liter', 'Satuan volume liter'),
  ('METER', 'Meter', 'Satuan panjang meter'),
  ('ROLL', 'Roll', 'Satuan roll'),
  ('LEMBAR', 'Lembar', 'Satuan lembar')
ON CONFLICT (kode) DO NOTHING;

-- 2. SUPPLIERS (for PO system)
INSERT INTO suppliers (kode, nama, alamat, telepon, email, kategori, status, is_active) VALUES
  ('SUP-001', 'PT Maju Bersama', 'Jl. Industri No. 10, Jakarta', '021-5551234', 'info@majubersama.co.id', 'raw_material', 'active', true),
  ('SUP-002', 'CV Sumber Makmur', 'Jl. Raya Bogor Km. 15, Jakarta', '021-5552345', 'sales@sumbermakmur.com', 'raw_material', 'active', true),
  ('SUP-003', 'PT Teknologi Nusantara', 'Jl. IT Hub No. 5, Jakarta', '021-5553456', 'contact@technusa.id', 'it', 'active', true),
  ('SUP-004', 'UD Alat Kantor Sejahtera', 'Jl. Thamrin No. 88, Jakarta', '021-5554567', 'order@alkon.co.id', 'office', 'active', true),
  ('SUP-005', 'PT Servis Prima', 'Jl. Service Area, Jakarta', '021-5555678', 'cs@servisprima.id', 'services', 'active', true)
ON CONFLICT (kode) DO NOTHING;

-- 3. VENDORS (for PR system)
INSERT INTO vendors (code, name, contact_person, phone, email, address, category, is_active) VALUES
  ('V-2024-0001', 'PT Indo Komputer', 'Budi Santoso', '081234567890', 'budi@indokomputer.co.id', 'Jl. Sudirman No. 123, Jakarta', 'it', true),
  ('V-2024-0002', 'CV Stationery Jaya', 'Siti Aminah', '082345678901', 'siti@stationeryjaya.com', 'Jl. Thamrin No. 45, Jakarta', 'office', true),
  ('V-2024-0003', 'PT Office Solutions', 'Agus Wijaya', '083456789012', 'agus@officesolutions.co.id', 'Jl. Gatot Subroto Kav. 78, Jakarta', 'stationery', true),
  ('V-2024-0004', 'Toko Bangunan ABC', 'Dewi Lestari', '084567890123', 'dewi@bangunanabc.id', 'Jl. Merdeka No. 50, Jakarta', 'raw_material', true),
  ('V-2024-0005', 'PT Jasa Cleaning Service', 'Hendra Kusuma', '085678901234', 'hendra@cleaningservice.id', 'Jl. Kemang No. 20, Jakarta', 'services', true)
ON CONFLICT (code) DO NOTHING;

-- 4. BAHAN BAKU (Raw Materials)
INSERT INTO bahan_baku (kode, nama, satuan_id, kategori, harga_estimasi, minimum_stock, lokasi_rak, is_active)
SELECT 
  'BB-001', 'Besi Beton 10mm', id, 'konstruksi', 25000, 100, 'RAK-A-01', true
FROM satuan WHERE kode = 'KG'
ON CONFLICT (kode) DO NOTHING;

INSERT INTO bahan_baku (kode, nama, satuan_id, kategori, harga_estimasi, minimum_stock, lokasi_rak, is_active)
SELECT 
  'BB-002', 'Semen Portland 50kg', id, 'konstruksi', 75000, 50, 'RAK-A-02', true
FROM satuan WHERE kode = 'BOX'
ON CONFLICT (kode) DO NOTHING;

INSERT INTO bahan_baku (kode, nama, satuan_id, kategori, harga_estimasi, minimum_stock, lokasi_rak, is_active)
SELECT 
  'BB-003', 'Cat Dinding 5L', id, 'finishing', 125000, 20, 'RAK-B-01', true
FROM satuan WHERE kode = 'LITER'
ON CONFLICT (kode) DO NOTHING;

INSERT INTO bahan_baku (kode, nama, satuan_id, kategori, harga_estimasi, minimum_stock, lokasi_rak, is_active)
SELECT 
  'BB-004', 'Paku 5cm', id, 'konstruksi', 15000, 200, 'RAK-A-03', true
FROM satuan WHERE kode = 'KG'
ON CONFLICT (kode) DO NOTHING;

INSERT INTO bahan_baku (kode, nama, satuan_id, kategori, harga_estimasi, minimum_stock, lokasi_rak, is_active)
SELECT 
  'BB-005', 'Kayu Jati 2m', id, 'konstruksi', 350000, 30, 'RAK-C-01', true
FROM satuan WHERE kode = 'METER'
ON CONFLICT (kode) DO NOTHING;

-- 5. PRODUK (Finished Products)
INSERT INTO produk (kode, nama, satuan_id, kategori, harga_jual, is_active)
SELECT 
  'PRD-001', 'Pagar Besi Dekoratif', id, 'konstruksi', 2500000, true
FROM satuan WHERE kode = 'METER'
ON CONFLICT (kode) DO NOTHING;

INSERT INTO produk (kode, nama, satuan_id, kategori, harga_jual, is_active)
SELECT 
  'PRD-002', 'Pintu Besi Custom', id, 'konstruksi', 1500000, true
FROM satuan WHERE kode = 'PCS'
ON CONFLICT (kode) DO NOTHING;

INSERT INTO produk (kode, nama, satuan_id, kategori, harga_jual, is_active)
SELECT 
  'PRD-003', 'Kusen Aluminium', id, 'konstruksi', 850000, true
FROM satuan WHERE kode = 'METER'
ON CONFLICT (kode) DO NOTHING;

-- 6. DEPARTMENTS
INSERT INTO departments (code, name) VALUES
  ('HR', 'Human Resources'),
  ('FIN', 'Finance'),
  ('IT', 'Information Technology'),
  ('OPS', 'Operations'),
  ('MKT', 'Marketing'),
  ('ADM', 'Administration'),
  ('PROC', 'Procurement'),
  ('WH', 'Warehouse')
ON CONFLICT (code) DO NOTHING;
