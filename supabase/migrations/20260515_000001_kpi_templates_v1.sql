-- ============================================================
-- KPI Template Management - Main Tables
-- Konsep: Template KPI per Department & Position
-- ============================================================

-- 1. KPI TEMPLATES (Header template per dept/position)
CREATE TABLE IF NOT EXISTS kpi_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  
  -- Period info
  applicable_period VARCHAR(100),
  effective_date DATE,
  expiry_date DATE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, archived
  is_active BOOLEAN DEFAULT true,
  
  -- Scoring config
  total_weight NUMERIC(5,2) DEFAULT 100,
  behavioral_weight NUMERIC(5,2) DEFAULT 20,
  project_weight NUMERIC(5,2) DEFAULT 10,
  
  -- Metadata
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_templates_department ON kpi_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_kpi_templates_position ON kpi_templates(position_id);
CREATE INDEX IF NOT EXISTS idx_kpi_templates_status ON kpi_templates(status);

-- RLS Policies
ALTER TABLE kpi_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_kpi_templates" ON kpi_templates;
DROP POLICY IF EXISTS "authenticated_read_kpi_templates" ON kpi_templates;
CREATE POLICY "service_role_kpi_templates" ON kpi_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_kpi_templates" ON kpi_templates FOR SELECT TO authenticated USING (true);

-- 2. KPI TEMPLATE ITEMS (Detail KPI dalam template)
CREATE TABLE IF NOT EXISTS kpi_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES kpi_templates(id) ON DELETE CASCADE,
  
  -- KPI Categories
  perspective VARCHAR(100), -- Business Process, Financial, Customer, Learning & Growth
  category VARCHAR(100), -- Main KPI, Supporting KPI
  
  -- KPI Details
  kpi_name VARCHAR(255) NOT NULL,
  kpi_definition TEXT,
  formula TEXT,
  control_method TEXT,
  
  -- Targets
  target_text TEXT,
  target_value NUMERIC(10,2) DEFAULT 0,
  measurement_unit VARCHAR(50), -- %, pcs, rupiah, days, etc
  weight NUMERIC(5,2) DEFAULT 0,
  frequency VARCHAR(50), -- Monthly, Quarterly, Yearly
  
  -- Scoring scale reference
  score_5_description TEXT, -- Outstanding criteria
  score_4_description TEXT, -- Exceed criteria
  score_3_description TEXT, -- Meet criteria
  score_2_description TEXT, -- Need Improvement criteria
  score_1_description TEXT, -- Unacceptable criteria
  
  -- Order
  item_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kpi_template_items_template ON kpi_template_items(template_id);

-- RLS Policies
ALTER TABLE kpi_template_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_kpi_template_items" ON kpi_template_items;
DROP POLICY IF EXISTS "authenticated_read_kpi_template_items" ON kpi_template_items;
CREATE POLICY "service_role_kpi_template_items" ON kpi_template_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_kpi_template_items" ON kpi_template_items FOR SELECT TO authenticated USING (true);

-- 3. Update PERFORMANCE REVIEWS (untuk assign template ke employee)
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to template
  kpi_template_id UUID REFERENCES kpi_templates(id) ON DELETE SET NULL,
  
  -- Employee info
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  employee_position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  
  -- Period
  period_label VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Scores (calculated from employee_kpis)
  total_work_result_score NUMERIC(6,2) DEFAULT 0,
  total_behavioral_score NUMERIC(6,2) DEFAULT 0,
  total_project_score NUMERIC(6,2) DEFAULT 0,
  grand_total_score NUMERIC(6,2) DEFAULT 0,
  category VARCHAR(50), -- Outstanding, Exceed, Meet, Need Improvement, Unacceptable
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- draft, in_progress, submitted, reviewed, finalized
  
  -- Reviewer info
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reviewer_name VARCHAR(255),
  reviewer_position VARCHAR(255),
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
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_template ON performance_reviews(kpi_template_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON performance_reviews(period_label);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

-- RLS Policies
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_performance_reviews" ON performance_reviews;
DROP POLICY IF EXISTS "authenticated_read_performance_reviews" ON performance_reviews;
CREATE POLICY "service_role_performance_reviews" ON performance_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_performance_reviews" ON performance_reviews FOR SELECT TO authenticated USING (true);

-- 4. EMPLOYEE KPIS (Realisasi KPI per employee, link dari template)
CREATE TABLE IF NOT EXISTS employee_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES kpi_template_items(id) ON DELETE SET NULL,
  
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- KPI Info (copy from template)
  perspective VARCHAR(100),
  category VARCHAR(100),
  kpi_name VARCHAR(255) NOT NULL,
  kpi_definition TEXT,
  formula TEXT,
  
  -- Target (from template, bisa di-adjust)
  target_text TEXT,
  target_value NUMERIC(10,2) DEFAULT 0,
  measurement_unit VARCHAR(50),
  weight NUMERIC(5,2) DEFAULT 0,
  frequency VARCHAR(50),
  
  -- Realisasi (diisi saat review)
  actual_value NUMERIC(10,2) DEFAULT 0,
  quality_actual NUMERIC(5,2) DEFAULT 0, -- 0-200%
  quantity_actual NUMERIC(5,2) DEFAULT 0, -- 0-200%
  timeliness_actual NUMERIC(5,2) DEFAULT 0, -- 0-200%
  
  -- Scoring (auto-calculated)
  achievement_percentage NUMERIC(6,2) DEFAULT 0,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  score_label VARCHAR(50),
  weighted_score NUMERIC(6,2) DEFAULT 0,
  
  -- Notes
  reviewer_notes TEXT,
  employee_comments TEXT,
  
  -- Metadata
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_kpis_review ON employee_kpis(review_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_employee ON employee_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_template_item ON employee_kpis(template_item_id);

-- RLS Policies
ALTER TABLE employee_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_employee_kpis" ON employee_kpis;
DROP POLICY IF EXISTS "authenticated_read_employee_kpis" ON employee_kpis;
CREATE POLICY "service_role_employee_kpis" ON employee_kpis FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_employee_kpis" ON employee_kpis FOR SELECT TO authenticated USING (true);
