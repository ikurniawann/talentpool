-- ============================================================
-- KPI Performance Management - Extended Schema V2
-- ============================================================

-- ============================================================
-- 1. BEHAVIORAL ASSESSMENTS (Values 5C)
-- ============================================================

CREATE TABLE IF NOT EXISTS behavioral_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_period VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Values 5C scores (1-5 each)
  caring_score INTEGER CHECK (caring_score BETWEEN 1 AND 5),
  caring_notes TEXT,
  credible_score INTEGER CHECK (credible_score BETWEEN 1 AND 5),
  credible_notes TEXT,
  competent_score INTEGER CHECK (competent_score BETWEEN 1 AND 5),
  competent_notes TEXT,
  competitive_score INTEGER CHECK (competitive_score BETWEEN 1 AND 5),
  competitive_notes TEXT,
  customer_delight_score INTEGER CHECK (customer_delight_score BETWEEN 1 AND 5),
  customer_delight_notes TEXT,
  
  -- Calculated fields
  total_score NUMERIC(6,2) DEFAULT 0,
  weight NUMERIC(5,2) DEFAULT 20.00,
  
  -- Metadata
  assessed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. DEVELOPMENT PLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS development_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_period VARCHAR(100) NOT NULL,
  
  -- Plan details
  development_type VARCHAR(100) NOT NULL,
  supported_kpi VARCHAR(255),
  involved_parties TEXT,
  execution_timeframe VARCHAR(100),
  notes TEXT,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'planned',
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PROJECT ASSIGNMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_period VARCHAR(100) NOT NULL,
  
  project_name VARCHAR(255) NOT NULL,
  project_description TEXT,
  role_in_project VARCHAR(100),
  
  -- Scoring
  target_score NUMERIC(6,2) DEFAULT 0,
  actual_score NUMERIC(6,2) DEFAULT 0,
  weight NUMERIC(5,2) DEFAULT 0,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_behavioral_assessments_employee_id ON behavioral_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_assessments_period ON behavioral_assessments(review_period);
CREATE INDEX IF NOT EXISTS idx_development_plans_employee_id ON development_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_development_plans_period ON development_plans(review_period);
CREATE INDEX IF NOT EXISTS idx_project_assignments_employee_id ON project_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_period ON project_assignments(review_period);

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

ALTER TABLE behavioral_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "service_role_behavioral_assessments" ON behavioral_assessments;
DROP POLICY IF EXISTS "authenticated_read_behavioral" ON behavioral_assessments;
DROP POLICY IF EXISTS "service_role_development_plans" ON development_plans;
DROP POLICY IF EXISTS "authenticated_read_development" ON development_plans;
DROP POLICY IF EXISTS "service_role_project_assignments" ON project_assignments;
DROP POLICY IF EXISTS "authenticated_read_projects" ON project_assignments;

-- Create policies
CREATE POLICY "service_role_behavioral_assessments" ON behavioral_assessments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_behavioral" ON behavioral_assessments FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_development_plans" ON development_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_development" ON development_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_project_assignments" ON project_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_projects" ON project_assignments FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 6. BEHAVIORAL STANDARDS (Values 5C definitions)
-- ============================================================

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

-- Insert behavioral standards data
DELETE FROM behavioral_standards WHERE value_name IN ('Caring', 'Credible', 'Competent', 'Competitive', 'Customer Delight');

INSERT INTO behavioral_standards (value_name, competency_name, standard_description, score_1_description, score_2_description, score_3_description, score_4_description, score_5_description, weight) 
VALUES 
('Caring', NULL, 'Menunjukkan kepedulian terhadap rekan kerja, kustomer, dan lingkungan kerja', 'Tidak menunjukkan perilaku yang diharapkan dan menjadi contoh negatif', 'Sudah menunjukkan perilaku yang diharapkan, namun masih harus sering diingatkan', 'Menunjukkan perilaku yang diharapkan secara mandiri, tanpa harus diingatkan', 'Menunjukkan perilaku yang diharapkan dan dapat menjadi contoh positif bagi lingkungannya', 'Menunjukkan perilaku yang diharapkan dan menjadi inspirasi atau role model bagi lingkungannya serta mampu membimbing orang lain', 3),
('Credible', NULL, 'Menjunjung tinggi integritas, kejujuran, dan kepercayaan', 'Tidak menunjukkan perilaku yang diharapkan dan menjadi contoh negatif', 'Sudah menunjukkan perilaku yang diharapkan, namun masih harus sering diingatkan', 'Menunjukkan perilaku yang diharapkan secara mandiri, tanpa harus diingatkan', 'Menunjukkan perilaku yang diharapkan dan dapat menjadi contoh positif bagi lingkungannya', 'Menunjukkan perilaku yang diharapkan dan menjadi inspirasi atau role model bagi lingkungannya serta mampu membimbing orang lain', 3),
('Competent', 'Achievement Orientation', 'Berorientasi pada pencapaian target dan hasil yang optimal', 'Tidak menunjukkan perilaku yang diharapkan dan menjadi contoh negatif', 'Sudah menunjukkan perilaku yang diharapkan, namun masih harus sering diingatkan', 'Menunjukkan perilaku yang diharapkan secara mandiri, tanpa harus diingatkan', 'Menunjukkan perilaku yang diharapkan dan dapat menjadi contoh positif bagi lingkungannya', 'Menunjukkan perilaku yang diharapkan dan menjadi inspirasi atau role model bagi lingkungannya serta mampu membimbing orang lain', 2),
('Competent', 'Concern for Order and Quality', 'Memperhatikan ketertiban, kualitas, dan standar kerja', 'Tidak menunjukkan perilaku yang diharapkan dan menjadi contoh negatif', 'Sudah menunjukkan perilaku yang diharapkan, namun masih harus sering diingatkan', 'Menunjukkan perilaku yang diharapkan secara mandiri, tanpa harus diingatkan', 'Menunjukkan perilaku yang diharapkan dan dapat menjadi contoh positif bagi lingkungannya', 'Menunjukkan perilaku yang diharapkan dan menjadi inspirasi atau role model bagi lingkungannya serta mampu membimbing orang lain', 2),
('Competitive', 'Initiative', 'Proaktif dan inovatif dalam menghadapi tantangan', 'Tidak menunjukkan perilaku yang diharapkan dan menjadi contoh negatif', 'Sudah menunjukkan perilaku yang diharapkan, namun masih harus sering diingatkan', 'Menunjukkan perilaku yang diharapkan secara mandiri, tanpa harus diingatkan', 'Menunjukkan perilaku yang diharapkan dan dapat menjadi contoh positif bagi lingkungannya', 'Menunjukkan perilaku yang diharapkan dan menjadi inspirasi atau role model bagi lingkungannya serta mampu membimbing orang lain', 6),
('Customer Delight', 'Customer Service Orientation', 'Berorientasi pada kepuasan dan kebutuhan pelanggan', 'Tidak menunjukkan perilaku yang diharapkan dan menjadi contoh negatif', 'Sudah menunjukkan perilaku yang diharapkan, namun masih harus sering diingatkan', 'Menunjukkan perilaku yang diharapkan secara mandiri, tanpa harus diingatkan', 'Menunjukkan perilaku yang diharapkan dan dapat menjadi contoh positif bagi lingkungannya', 'Menunjukkan perilaku yang diharapkan dan menjadi inspirasi atau role model bagi lingkungannya serta mampu membimbing orang lain', 6);

ALTER TABLE behavioral_standards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_behavioral_standards" ON behavioral_standards;
DROP POLICY IF EXISTS "authenticated_read_behavioral_standards" ON behavioral_standards;
CREATE POLICY "service_role_behavioral_standards" ON behavioral_standards FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_behavioral_standards" ON behavioral_standards FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 7. SCORE SCALE REFERENCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS score_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score INTEGER NOT NULL UNIQUE CHECK (score BETWEEN 1 AND 5),
  label VARCHAR(50) NOT NULL,
  quality_description TEXT,
  quantity_min_percent NUMERIC(5,2),
  quantity_max_percent NUMERIC(5,2),
  time_description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Insert score scales data
INSERT INTO score_scales (score, label, quality_description, quantity_min_percent, quantity_max_percent, time_description) VALUES
(5, 'Outstanding', 'Jauh melampaui standar, hasil exceptional', 130.01, 999.99, 'Jauh Lebih Cepat (< 25% dari waktu yang ditetapkan)'),
(4, 'Exceed Expectation', 'Melampaui standar dengan hasil yang sangat baik', 115.01, 130.00, 'Lebih Cepat (< 10% dari waktu yang ditetapkan)'),
(3, 'Meet Expectation', 'Memenuhi standar yang diharapkan', 95.01, 115.00, 'Tepat waktu'),
(2, 'Need Improvement', 'Hampir memenuhi standar, perlu perbaikan', 70.01, 95.00, 'Terlambat (> 10% dari waktu yang ditetapkan)'),
(1, 'Unacceptable', 'Tidak memenuhi standar minimum', 0.00, 70.00, 'Sangat terlambat (> 25% dari waktu yang ditetapkan)')
ON CONFLICT (score) DO UPDATE SET
  label = EXCLUDED.label,
  quality_description = EXCLUDED.quality_description,
  quantity_min_percent = EXCLUDED.quantity_min_percent,
  quantity_max_percent = EXCLUDED.quantity_max_percent,
  time_description = EXCLUDED.time_description;

ALTER TABLE score_scales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_score_scales" ON score_scales;
DROP POLICY IF EXISTS "authenticated_read_score_scales" ON score_scales;
CREATE POLICY "service_role_score_scales" ON score_scales FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_score_scales" ON score_scales FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 8. CATEGORY RANGES
-- ============================================================

CREATE TABLE IF NOT EXISTS performance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(50) NOT NULL UNIQUE,
  min_score NUMERIC(6,2) NOT NULL,
  max_score NUMERIC(6,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Insert performance categories data
INSERT INTO performance_categories (category_name, min_score, max_score, description) VALUES
('Outstanding', 441.00, 500.00, 'Kinerja luar biasa, melampaui ekspektasi secara signifikan'),
('Exceed Expectation', 351.00, 440.99, 'Kinerja sangat baik, melampaui ekspektasi'),
('Meet Expectation', 251.00, 350.99, 'Kinerja memenuhi standar yang diharapkan'),
('Need Improvement', 161.00, 250.99, 'Kinerja perlu perbaikan untuk memenuhi standar'),
('Unacceptable', 0.00, 160.99, 'Kinerja tidak memenuhi standar minimum')
ON CONFLICT (category_name) DO UPDATE SET
  min_score = EXCLUDED.min_score,
  max_score = EXCLUDED.max_score,
  description = EXCLUDED.description;

ALTER TABLE performance_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_perf_categories" ON performance_categories;
DROP POLICY IF EXISTS "authenticated_read_perf_categories" ON performance_categories;
CREATE POLICY "service_role_perf_categories" ON performance_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_perf_categories" ON performance_categories FOR SELECT TO authenticated USING (true);
