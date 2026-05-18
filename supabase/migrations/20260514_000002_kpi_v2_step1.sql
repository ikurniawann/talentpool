-- ============================================================
-- KPI Performance Management V2 - Step 1: Core Tables
-- Jalankan ini dulu
-- ============================================================

-- 1. BEHAVIORAL ASSESSMENTS
CREATE TABLE IF NOT EXISTS behavioral_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_period VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  caring_score INTEGER,
  caring_notes TEXT,
  credible_score INTEGER,
  credible_notes TEXT,
  competent_score INTEGER,
  competent_notes TEXT,
  competitive_score INTEGER,
  competitive_notes TEXT,
  customer_delight_score INTEGER,
  customer_delight_notes TEXT,
  total_score NUMERIC(6,2) DEFAULT 0,
  assessed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DEVELOPMENT PLANS
CREATE TABLE IF NOT EXISTS development_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_period VARCHAR(100) NOT NULL,
  development_type VARCHAR(100) NOT NULL,
  supported_kpi VARCHAR(255),
  involved_parties TEXT,
  execution_timeframe VARCHAR(100),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'planned',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROJECT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_period VARCHAR(100) NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  project_description TEXT,
  role_in_project VARCHAR(100),
  target_score NUMERIC(6,2) DEFAULT 0,
  actual_score NUMERIC(6,2) DEFAULT 0,
  weight NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
