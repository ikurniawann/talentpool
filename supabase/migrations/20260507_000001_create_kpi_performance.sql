-- KPI & Performance Management Migration

CREATE TABLE IF NOT EXISTS kpi_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  default_weight NUMERIC(5,2) DEFAULT 100,
  default_target NUMERIC(10,2),
  unit VARCHAR(50),
  measurement_frequency VARCHAR(50),
  measurement_formula TEXT,
  is_predefined BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_template_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES kpi_templates(id) ON DELETE CASCADE,
  mapping_type VARCHAR(20) NOT NULL,
  mapping_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES kpi_templates(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  weight NUMERIC(5,2),
  target NUMERIC(10,2),
  unit VARCHAR(50),
  actual_value NUMERIC(10,2),
  achievement_percentage NUMERIC(5,2),
  measurement_frequency VARCHAR(50),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft',
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_kpi_id UUID NOT NULL REFERENCES employee_kpis(id) ON DELETE CASCADE,
  actual_value NUMERIC(10,2) NOT NULL,
  notes TEXT,
  evidence_url TEXT,
  updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  period_label VARCHAR(100),
  period_start DATE,
  period_end DATE,
  overall_score NUMERIC(5,2),
  kpi_score NUMERIC(5,2),
  behavior_score NUMERIC(5,2),
  strengths TEXT,
  improvements TEXT,
  comments TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_template_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_kpi_templates" ON kpi_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_kpi_templates" ON kpi_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_kpi_template_mappings" ON kpi_template_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_kpi_template_mappings" ON kpi_template_mappings FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_employee_kpis" ON employee_kpis FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_employee_kpis" ON employee_kpis FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_kpi_progress_updates" ON kpi_progress_updates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_kpi_progress_updates" ON kpi_progress_updates FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_performance_reviews" ON performance_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_performance_reviews" ON performance_reviews FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_templates_category ON kpi_templates(category);
CREATE INDEX IF NOT EXISTS idx_kpi_templates_is_active ON kpi_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_kpi_template_mappings_template_id ON kpi_template_mappings(template_id);
CREATE INDEX IF NOT EXISTS idx_kpi_template_mappings_mapping_id ON kpi_template_mappings(mapping_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_employee_id ON employee_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_status ON employee_kpis(status);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_period_label ON employee_kpis(period_label);
CREATE INDEX IF NOT EXISTS idx_kpi_progress_updates_kpi_id ON kpi_progress_updates(employee_kpi_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

-- Seed 30 predefined KPI templates
INSERT INTO kpi_templates (name, description, category, default_weight, default_target, unit, measurement_frequency, measurement_formula, is_predefined, is_active) VALUES

-- Sales (5)
('Target Penjualan Bulanan', 'Pencapaian target penjualan dalam satu bulan', 'Sales', 25.00, 100.00, '%', 'Monthly', 'Aktual Penjualan / Target Penjualan × 100', true, true),
('Jumlah Pelanggan Baru', 'Jumlah pelanggan baru yang berhasil didapatkan', 'Sales', 20.00, 20.00, 'Jumlah', 'Monthly', 'Hitung jumlah pelanggan baru dalam periode', true, true),
('Nilai Kontrak Tertutup', 'Total nilai kontrak yang berhasil ditutup', 'Sales', 25.00, 50000000.00, 'Rupiah', 'Monthly', 'Total nilai kontrak yang ditandatangani dalam periode', true, true),
('Tingkat Konversi Prospek', 'Persentase prospek yang berhasil dikonversi menjadi pelanggan', 'Sales', 15.00, 30.00, '%', 'Monthly', 'Jumlah Konversi / Total Prospek × 100', true, true),
('Retensi Pelanggan', 'Persentase pelanggan lama yang tetap bertahan', 'Sales', 15.00, 90.00, '%', 'Quarterly', 'Pelanggan Aktif Akhir Periode / Pelanggan Awal Periode × 100', true, true),

-- Operations (5)
('Efisiensi Produksi', 'Persentase output aktual dibanding kapasitas produksi', 'Operations', 25.00, 85.00, '%', 'Monthly', 'Output Aktual / Kapasitas Produksi × 100', true, true),
('Waktu Penyelesaian Order', 'Rata-rata waktu dari order masuk hingga pengiriman', 'Operations', 20.00, 3.00, 'Jam', 'Monthly', 'Total Waktu Penyelesaian / Jumlah Order', true, true),
('Tingkat Kesalahan Produksi', 'Persentase produk cacat atau tidak sesuai standar', 'Operations', 20.00, 2.00, '%', 'Monthly', 'Jumlah Produk Cacat / Total Produksi × 100', true, true),
('Kepatuhan SOP', 'Persentase kepatuhan terhadap prosedur standar operasi', 'Operations', 20.00, 95.00, '%', 'Monthly', 'Jumlah Langkah SOP Dipatuhi / Total Langkah SOP × 100', true, true),
('Utilisasi Kapasitas', 'Persentase pemanfaatan kapasitas tersedia', 'Operations', 15.00, 80.00, '%', 'Monthly', 'Kapasitas Terpakai / Total Kapasitas × 100', true, true),

-- Customer Service (4)
('Kepuasan Pelanggan (CSAT)', 'Skor kepuasan pelanggan dari survei', 'Customer Service', 30.00, 85.00, 'Score', 'Monthly', 'Total Skor / Jumlah Responden', true, true),
('Waktu Respons Pertama', 'Rata-rata waktu respons pertama terhadap pertanyaan pelanggan', 'Customer Service', 25.00, 2.00, 'Jam', 'Monthly', 'Total Waktu Respons / Jumlah Tiket', true, true),
('Tingkat Penyelesaian Tiket', 'Persentase tiket yang diselesaikan dalam SLA', 'Customer Service', 25.00, 90.00, '%', 'Monthly', 'Tiket Selesai dalam SLA / Total Tiket × 100', true, true),
('Net Promoter Score (NPS)', 'Skor kemungkinan pelanggan merekomendasikan produk/layanan', 'Customer Service', 20.00, 50.00, 'Score', 'Quarterly', 'Persentase Promotor - Persentase Detractor', true, true),

-- Finance (4)
('Ketepatan Laporan Keuangan', 'Persentase laporan keuangan yang disubmit tepat waktu dan akurat', 'Finance', 30.00, 100.00, '%', 'Monthly', 'Laporan Tepat Waktu & Akurat / Total Laporan × 100', true, true),
('Penghematan Anggaran', 'Persentase anggaran yang berhasil dihemat', 'Finance', 25.00, 5.00, '%', 'Quarterly', '(Anggaran - Realisasi) / Anggaran × 100', true, true),
('Akurasi Proyeksi Keuangan', 'Persentase akurasi proyeksi keuangan vs aktual', 'Finance', 25.00, 90.00, '%', 'Quarterly', '1 - |Proyeksi - Aktual| / Aktual × 100', true, true),
('Tingkat Penagihan Piutang', 'Persentase piutang yang berhasil ditagih tepat waktu', 'Finance', 20.00, 85.00, '%', 'Monthly', 'Piutang Tertagih / Total Piutang × 100', true, true),

-- HR (4)
('Tingkat Retensi Karyawan', 'Persentase karyawan yang bertahan dalam satu tahun', 'HR', 30.00, 90.00, '%', 'Annually', '(Karyawan Awal - Karyawan Keluar) / Karyawan Awal × 100', true, true),
('Waktu Rekrutmen', 'Rata-rata waktu dari posting lowongan hingga penempatan karyawan baru', 'HR', 25.00, 30.00, 'Jam', 'Monthly', 'Total Waktu Rekrutmen / Jumlah Posisi Terisi', true, true),
('Tingkat Kehadiran Karyawan', 'Persentase kehadiran karyawan dari total hari kerja', 'HR', 25.00, 95.00, '%', 'Monthly', 'Hari Hadir / Total Hari Kerja × 100', true, true),
('Penyelesaian Program Pelatihan', 'Persentase karyawan yang menyelesaikan program pelatihan', 'HR', 20.00, 90.00, '%', 'Quarterly', 'Karyawan Selesai Pelatihan / Target Peserta × 100', true, true),

-- Technical (4)
('Uptime Sistem', 'Persentase waktu sistem berjalan tanpa gangguan', 'Technical', 30.00, 99.50, '%', 'Monthly', '(Total Waktu - Waktu Downtime) / Total Waktu × 100', true, true),
('Waktu Penyelesaian Bug', 'Rata-rata waktu penyelesaian laporan bug', 'Technical', 25.00, 24.00, 'Jam', 'Monthly', 'Total Waktu Penyelesaian Bug / Jumlah Bug', true, true),
('Kecepatan Deploy', 'Jumlah deploy sukses dalam satu periode', 'Technical', 25.00, 10.00, 'Jumlah', 'Monthly', 'Hitung jumlah deployment yang berhasil', true, true),
('Cakupan Pengujian (Test Coverage)', 'Persentase kode yang tercakup oleh unit test', 'Technical', 20.00, 80.00, '%', 'Monthly', 'Baris Kode Diuji / Total Baris Kode × 100', true, true),

-- Marketing (4)
('Pertumbuhan Traffic Website', 'Persentase pertumbuhan pengunjung website', 'Marketing', 25.00, 20.00, '%', 'Monthly', '(Traffic Bulan Ini - Traffic Bulan Lalu) / Traffic Bulan Lalu × 100', true, true),
('Biaya per Akuisisi (CPA)', 'Biaya rata-rata untuk mendapatkan satu pelanggan baru', 'Marketing', 25.00, 100000.00, 'Rupiah', 'Monthly', 'Total Biaya Marketing / Jumlah Pelanggan Baru', true, true),
('Tingkat Keterlibatan Media Sosial', 'Rata-rata engagement rate di platform media sosial', 'Marketing', 25.00, 5.00, '%', 'Monthly', 'Total Interaksi / Total Jangkauan × 100', true, true),
('Return on Ad Spend (ROAS)', 'Pendapatan yang dihasilkan per rupiah iklan', 'Marketing', 25.00, 4.00, 'Score', 'Monthly', 'Pendapatan dari Iklan / Biaya Iklan', true, true);
