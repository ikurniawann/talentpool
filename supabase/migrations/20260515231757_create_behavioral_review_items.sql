-- Row-based Values 5C assessment copied from KPI template behavioral rows.
-- Each row follows sheet (G) Aspek Perilaku: text standard, score 1-5, preset weight, notes.
CREATE TABLE IF NOT EXISTS behavioral_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  template_behavioral_id UUID REFERENCES kpi_template_behavioral(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

  value_name VARCHAR(100) NOT NULL,
  competency VARCHAR(255),
  behavioral_standard TEXT,

  score_1_description TEXT,
  score_2_description TEXT,
  score_3_description TEXT,
  score_4_description TEXT,
  score_5_description TEXT,

  weight NUMERIC(6,2) DEFAULT 0,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  weighted_score NUMERIC(10,4) DEFAULT 0,
  notes TEXT,

  item_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavioral_review_items_review ON behavioral_review_items(review_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_review_items_employee ON behavioral_review_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_review_items_template ON behavioral_review_items(template_behavioral_id);

ALTER TABLE behavioral_review_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_behavioral_review_items" ON behavioral_review_items;
DROP POLICY IF EXISTS "authenticated_read_behavioral_review_items" ON behavioral_review_items;

CREATE POLICY "service_role_behavioral_review_items"
  ON behavioral_review_items FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read_behavioral_review_items"
  ON behavioral_review_items FOR SELECT TO authenticated
  USING (true);
