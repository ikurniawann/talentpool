-- ============================================================
-- KPI Performance Management - Main Tables
-- Tabel utama untuk Performance Reviews
-- ============================================================

-- 1. PERFORMANCE REVIEWS (main table)
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_label VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Scores
  total_work_result_score NUMERIC(6,2) DEFAULT 0,
  total_behavioral_score NUMERIC(6,2) DEFAULT 0,
  total_project_score NUMERIC(6,2) DEFAULT 0,
  grand_total_score NUMERIC(6,2) DEFAULT 0,
  category VARCHAR(50),
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  
  -- Reviewer info
  reviewer_name VARCHAR(255),
  reviewer_position VARCHAR(255),
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- Signatures
  reviewee_sign_date DATE,
  reviewer_sign_date DATE,
  employee_sign_date DATE,
  
  -- Notes
  self_assessment TEXT,
  reviewer_notes TEXT,
  manager_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON performance_reviews(period_label);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

-- RLS Policies
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_performance_reviews" ON performance_reviews;
DROP POLICY IF EXISTS "authenticated_read_performance_reviews" ON performance_reviews;
CREATE POLICY "service_role_performance_reviews" ON performance_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_performance_reviews" ON performance_reviews FOR SELECT TO authenticated USING (true);

-- 2. EMPLOYEE KPIS (KPI items untuk setiap review)
CREATE TABLE IF NOT EXISTS employee_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_label VARCHAR(100) NOT NULL,
  
  -- KPI Details
  perspective VARCHAR(100),
  strategic_objective VARCHAR(255),
  kpi_name VARCHAR(255),
  kpi_definition TEXT,
  control TEXT,
  
  -- Targets
  target_text TEXT,
  target_value NUMERIC(10,2) DEFAULT 0,
  weight NUMERIC(5,2) DEFAULT 0,
  frequency VARCHAR(50),
  
  -- Actual Results
  actual_value NUMERIC(10,2) DEFAULT 0,
  quality_actual NUMERIC(5,2) DEFAULT 0,
  quantity_actual NUMERIC(5,2) DEFAULT 0,
  timeliness_actual NUMERIC(5,2) DEFAULT 0,
  
  -- Scoring
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  score_label VARCHAR(50),
  final_score NUMERIC(6,2) DEFAULT 0,
  
  -- Reviewer assessment
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_kpis_review_id ON employee_kpis(review_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_employee_id ON employee_kpis(employee_id);

-- RLS Policies
ALTER TABLE employee_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_employee_kpis" ON employee_kpis;
DROP POLICY IF EXISTS "authenticated_read_employee_kpis" ON employee_kpis;
CREATE POLICY "service_role_employee_kpis" ON employee_kpis FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_employee_kpis" ON employee_kpis FOR SELECT TO authenticated USING (true);
