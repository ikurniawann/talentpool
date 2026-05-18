-- ============================================================
-- KPI Performance Management V2 - Step 2: Reference Tables
-- Jalankan ini SETELAH Step 1 berhasil
-- ============================================================

-- 4. BEHAVIORAL STANDARDS
CREATE TABLE IF NOT EXISTS behavioral_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value_name VARCHAR(50) NOT NULL,
  competency_name VARCHAR(100),
  standard_description TEXT,
  score_1_description TEXT,
  score_2_description TEXT,
  score_3_description TEXT,
  score_4_description TEXT,
  score_5_description TEXT,
  weight NUMERIC(5,2) DEFAULT 0.03,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert data
INSERT INTO behavioral_standards (value_name, competency_name, standard_description, score_1_description, score_2_description, score_3_description, score_4_description, score_5_description, weight) 
VALUES 
('Caring', NULL, 'Menunjukkan kepedulian terhadap rekan kerja dan lingkungan', 'Tidak menunjukkan perilaku yang diharapkan', 'Masih harus sering diingatkan', 'Menunjukkan perilaku secara mandiri', 'Dapat menjadi contoh positif', 'Menjadi inspirasi dan role model', 3),
('Credible', NULL, 'Menjunjung tinggi integritas dan kepercayaan', 'Tidak menunjukkan perilaku yang diharapkan', 'Masih harus sering diingatkan', 'Menunjukkan perilaku secara mandiri', 'Dapat menjadi contoh positif', 'Menjadi inspirasi dan role model', 3),
('Competent', 'Achievement', 'Berorientasi pada pencapaian target', 'Tidak menunjukkan perilaku yang diharapkan', 'Masih harus sering diingatkan', 'Menunjukkan perilaku secara mandiri', 'Dapat menjadi contoh positif', 'Menjadi inspirasi dan role model', 2),
('Competent', 'Order & Quality', 'Memperhatikan ketertiban dan kualitas', 'Tidak menunjukkan perilaku yang diharapkan', 'Masih harus sering diingatkan', 'Menunjukkan perilaku secara mandiri', 'Dapat menjadi contoh positif', 'Menjadi inspirasi dan role model', 2),
('Competitive', 'Initiative', 'Proaktif dan inovatif', 'Tidak menunjukkan perilaku yang diharapkan', 'Masih harus sering diingatkan', 'Menunjukkan perilaku secara mandiri', 'Dapat menjadi contoh positif', 'Menjadi inspirasi dan role model', 6),
('Customer Delight', 'Service', 'Berorientasi pada kepuasan pelanggan', 'Tidak menunjukkan perilaku yang diharapkan', 'Masih harus sering diingatkan', 'Menunjukkan perilaku secara mandiri', 'Dapat menjadi contoh positif', 'Menjadi inspirasi dan role model', 6);

-- 5. SCORE SCALES
CREATE TABLE IF NOT EXISTS score_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score INTEGER NOT NULL UNIQUE,
  label VARCHAR(50) NOT NULL,
  quality_description TEXT,
  quantity_min_percent NUMERIC(5,2),
  quantity_max_percent NUMERIC(5,2),
  time_description TEXT
);

INSERT INTO score_scales (score, label, quality_description, quantity_min_percent, quantity_max_percent, time_description) VALUES
(5, 'Outstanding', 'Jauh melampaui standar', 130.01, 999.99, 'Jauh Lebih Cepat'),
(4, 'Exceed Expectation', 'Melampaui standar', 115.01, 130.00, 'Lebih Cepat'),
(3, 'Meet Expectation', 'Memenuhi standar', 95.01, 115.00, 'Tepat waktu'),
(2, 'Need Improvement', 'Perlu perbaikan', 70.01, 95.00, 'Terlambat'),
(1, 'Unacceptable', 'Tidak memenuhi standar', 0.00, 70.00, 'Sangat terlambat')
ON CONFLICT (score) DO UPDATE SET label = EXCLUDED.label;

-- 6. PERFORMANCE CATEGORIES
CREATE TABLE IF NOT EXISTS performance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(50) NOT NULL UNIQUE,
  min_score NUMERIC(6,2) NOT NULL,
  max_score NUMERIC(6,2) NOT NULL,
  description TEXT
);

INSERT INTO performance_categories (category_name, min_score, max_score, description) VALUES
('Outstanding', 441.00, 500.00, 'Kinerja luar biasa'),
('Exceed Expectation', 351.00, 440.99, 'Kinerja sangat baik'),
('Meet Expectation', 251.00, 350.99, 'Kinerja memenuhi standar'),
('Need Improvement', 161.00, 250.99, 'Kinerja perlu perbaikan'),
('Unacceptable', 0.00, 160.99, 'Kinerja tidak memenuhi standar')
ON CONFLICT (category_name) DO UPDATE SET min_score = EXCLUDED.min_score;
