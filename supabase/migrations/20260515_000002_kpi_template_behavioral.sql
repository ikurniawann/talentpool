-- ============================================================
-- KPI Template Behavioral Data
-- Menyimpan Behavioral 5C untuk setiap template
-- ============================================================

-- KPI TEMPLATE BEHAVIORAL ITEMS
CREATE TABLE IF NOT EXISTS kpi_template_behavioral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES kpi_templates(id) ON DELETE CASCADE,
  
  -- 5C Values
  value_name VARCHAR(100) NOT NULL, -- Caring, Credible, Competent, dll
  competency VARCHAR(255), -- Achievement Orientation, dll
  
  -- Behavioral Standard
  behavioral_standard TEXT,
  
  -- Weight
  weight NUMERIC(5,2) DEFAULT 0,
  
  -- Scoring descriptions
  score_5_description TEXT, -- Outstanding
  score_4_description TEXT, -- Exceed
  score_3_description TEXT, -- Meet
  score_2_description TEXT, -- Need Improvement
  score_1_description TEXT, -- Unacceptable
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_kpi_template_behavioral_template ON kpi_template_behavioral(template_id);

-- RLS Policies
ALTER TABLE kpi_template_behavioral ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_kpi_template_behavioral" ON kpi_template_behavioral;
DROP POLICY IF EXISTS "authenticated_read_kpi_template_behavioral" ON kpi_template_behavioral;
CREATE POLICY "service_role_kpi_template_behavioral" ON kpi_template_behavioral FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_kpi_template_behavioral" ON kpi_template_behavioral FOR SELECT TO authenticated USING (true);
