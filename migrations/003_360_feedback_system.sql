-- ============================================================
-- 360° FEEDBACK SYSTEM
-- Multi-source feedback untuk performance review
-- ============================================================

-- ============================================================
-- 1. FEEDBACK CATEGORIES (Behavioral Metrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  description text,
  weight decimal(5,2) DEFAULT 20.00, -- Default 20% per category (5 categories = 100%)
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feedback_categories_active ON feedback_categories(is_active);

-- Seed data untuk 5 behavioral metrics dari KPI.md
INSERT INTO feedback_categories (name, description, weight, display_order) VALUES
  ('Leadership', 'Kemampuan memimpin, mengarahkan, dan menginspirasi tim', 20.00, 1),
  ('Communication', 'Efektivitas komunikasi verbal dan tertulis', 20.00, 2),
  ('Collaboration', 'Kemampuan bekerja sama dalam tim lintas fungsi', 20.00, 3),
  ('Accountability', 'Tanggung jawab atas hasil dan komitmen', 20.00, 4),
  ('Problem Solving', 'Kemampuan menganalisis dan menyelesaikan masalah', 20.00, 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. FEEDBACK CRITERIA (Indikator per kategori)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES feedback_categories(id) ON DELETE CASCADE,
  name varchar(200) NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feedback_criteria_category ON feedback_criteria(category_id);

-- Seed criteria untuk setiap kategori
INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Menetapkan arah dan tujuan yang jelas', 'Mampu menetapkan visi dan target yang jelas untuk tim', 1
FROM feedback_categories fc WHERE fc.name = 'Leadership'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Memberikan feedback konstruktif', 'Memberikan masukan yang membangun untuk perkembangan tim', 2
FROM feedback_categories fc WHERE fc.name = 'Leadership'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Menginspirasi dan memotivasi', 'Mampu memotivasi tim untuk mencapai target', 3
FROM feedback_categories fc WHERE fc.name = 'Leadership'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Komunikasi verbal yang efektif', 'Menyampaikan ide dengan jelas dalam diskusi/presentasi', 1
FROM feedback_categories fc WHERE fc.name = 'Communication'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Komunikasi tertulis yang baik', 'Email, dokumen, dan laporan yang jelas dan terstruktur', 2
FROM feedback_categories fc WHERE fc.name = 'Communication'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Mendengarkan aktif', 'Mendengarkan dan memahami perspektif orang lain', 3
FROM feedback_categories fc WHERE fc.name = 'Communication'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Berbagi pengetahuan', 'Mau berbagi informasi dan expertise dengan tim', 1
FROM feedback_categories fc WHERE fc.name = 'Collaboration'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Dukungan kepada rekan tim', 'Membantu rekan tim saat dibutuhkan', 2
FROM feedback_categories fc WHERE fc.name = 'Collaboration'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Fleksibilitas dalam tim', 'Mampu beradaptasi dengan berbagai gaya kerja', 3
FROM feedback_categories fc WHERE fc.name = 'Collaboration'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Memenuhi komitmen', 'Menyelesaikan tugas sesuai janji dan deadline', 1
FROM feedback_categories fc WHERE fc.name = 'Accountability'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Tanggung jawab atas kesalahan', 'Mengakui kesalahan dan belajar darinya', 2
FROM feedback_categories fc WHERE fc.name = 'Accountability'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Inisiatif dan proaktif', 'Tidak menunggu perintah, mengambil inisiatif', 3
FROM feedback_categories fc WHERE fc.name = 'Accountability'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Analisis masalah sistematis', 'Mengidentifikasi akar masalah dengan baik', 1
FROM feedback_categories fc WHERE fc.name = 'Problem Solving'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Solusi kreatif dan inovatif', 'Menawarkan solusi yang efektif dan kreatif', 2
FROM feedback_categories fc WHERE fc.name = 'Problem Solving'
ON CONFLICT DO NOTHING;

INSERT INTO feedback_criteria (category_id, name, description, display_order)
SELECT fc.id, 'Pengambilan keputusan', 'Mampu mengambil keputusan tepat waktu', 3
FROM feedback_categories fc WHERE fc.name = 'Problem Solving'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. FEEDBACK RELATIONSHIP TYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_relationship_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL, -- 'self', 'manager', 'peer', 'subordinate', 'external'
  description text,
  display_order integer DEFAULT 0
);

INSERT INTO feedback_relationship_types (name, description, display_order) VALUES
  ('self', 'Self-assessment / penilaian diri', 1),
  ('manager', 'Feedback dari manager langsung', 2),
  ('peer', 'Feedback dari rekan setara', 3),
  ('subordinate', 'Feedback dari bawahan langsung', 4),
  ('external', 'Feedback dari client/stakeholder eksternal', 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. 360 FEEDBACK CYCLES
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  period_label varchar(100) NOT NULL, -- 'Q1 2026', '2026 Annual'
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar(50) DEFAULT 'draft', -- 'draft', 'active', 'completed', 'cancelled'
  kpi_weight decimal(5,2) DEFAULT 70.00, -- 70% KPI
  feedback_weight decimal(5,2) DEFAULT 30.00, -- 30% 360 feedback
  is_anonymous boolean DEFAULT true,
  allow_self_assessment boolean DEFAULT true,
  require_manager_review boolean DEFAULT true,
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feedback_cycles_status ON feedback_cycles(status);
CREATE INDEX idx_feedback_cycles_period ON feedback_cycles(period_label);

-- ============================================================
-- 5. FEEDBACK ASSIGNMENTS (Siapa menilai siapa)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE, -- Yang dinilai
  reviewer_id uuid REFERENCES employees(id) ON DELETE SET NULL, -- Yang menilai (null untuk self)
  relationship_type varchar(50) NOT NULL, -- 'self', 'manager', 'peer', 'subordinate', 'external'
  status varchar(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'submitted', 'completed'
  due_date date,
  started_at timestamptz,
  submitted_at timestamptz,
  reminder_count integer DEFAULT 0,
  last_reminder_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id, reviewer_id, relationship_type)
);

CREATE INDEX idx_feedback_assignments_cycle ON feedback_assignments(cycle_id);
CREATE INDEX idx_feedback_assignments_employee ON feedback_assignments(employee_id);
CREATE INDEX idx_feedback_assignments_reviewer ON feedback_assignments(reviewer_id);
CREATE INDEX idx_feedback_assignments_status ON feedback_assignments(status);

-- ============================================================
-- 6. 360 FEEDBACK RESPONSES (Jawaban per criteria)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES feedback_assignments(id) ON DELETE CASCADE,
  criteria_id uuid NOT NULL REFERENCES feedback_criteria(id) ON DELETE RESTRICT,
  
  -- Rating 1-5 scale
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  
  -- Optional written feedback
  comments text,
  
  -- AI Analysis (untuk sentiment analysis nanti)
  sentiment_score decimal(5,2), -- -1.0 (negative) to 1.0 (positive)
  sentiment_label varchar(20), -- 'negative', 'neutral', 'positive'
  ai_keywords text[], -- Keywords extracted by AI
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, criteria_id)
);

CREATE INDEX idx_feedback_responses_assignment ON feedback_responses(assignment_id);
CREATE INDEX idx_feedback_responses_criteria ON feedback_responses(criteria_id);
CREATE INDEX idx_feedback_responses_sentiment ON feedback_responses(sentiment_label);

-- ============================================================
-- 7. FEEDBACK SUMMARY (Aggregated scores per employee per cycle)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES feedback_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Category scores (averaged from all reviewers)
  leadership_score decimal(5,2),
  communication_score decimal(5,2),
  collaboration_score decimal(5,2),
  accountability_score decimal(5,2),
  problem_solving_score decimal(5,2),
  
  -- Overall 360 score (weighted average)
  overall_360_score decimal(5,2),
  
  -- KPI score (from employee_kpis)
  kpi_score decimal(5,2),
  
  -- Final combined score
  final_score decimal(5,2), -- (KPI × 70%) + (360 × 30%)
  final_grade varchar(2), -- 'A', 'B', 'C', 'D', 'E'
  
  -- Review status
  manager_review_status varchar(50) DEFAULT 'pending', -- 'pending', 'in_review', 'approved', 'rejected'
  manager_comments text,
  reviewed_by uuid REFERENCES employees(id),
  reviewed_at timestamptz,
  
  -- AI Insights
  strengths text[], -- AI-generated strengths
  weaknesses text[], -- AI-generated areas for improvement
  burnout_risk varchar(20), -- 'low', 'medium', 'high'
  promotion_potential varchar(20), -- 'low', 'medium', 'high'
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);

CREATE INDEX idx_feedback_summaries_cycle ON feedback_summaries(cycle_id);
CREATE INDEX idx_feedback_summaries_employee ON feedback_summaries(employee_id);
CREATE INDEX idx_feedback_summaries_score ON feedback_summaries(final_score);

-- ============================================================
-- 8. DEVELOPMENT PLANS (Action items dari review)
-- ============================================================
CREATE TABLE IF NOT EXISTS development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id uuid NOT NULL REFERENCES feedback_summaries(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Development goal
  goal text NOT NULL,
  category varchar(50), -- 'skill', 'behavior', 'knowledge', 'certification'
  priority varchar(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  
  -- Action items
  action_items text[],
  
  -- Timeline
  target_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status varchar(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
  
  -- Support needed
  resources_needed text,
  mentor_id uuid REFERENCES employees(id),
  
  -- Review
  notes text,
  completed_at timestamptz,
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_development_plans_employee ON development_plans(employee_id);
CREATE INDEX idx_development_plans_status ON development_plans(status);

-- ============================================================
-- 9. VIEWS FOR REPORTING
-- ============================================================

-- View: Employee 360 Summary
CREATE OR REPLACE VIEW v_employee_360_summary AS
SELECT 
  fs.id,
  fs.cycle_id,
  fs.employee_id,
  e.full_name,
  e.nip,
  d.name as department_name,
  p.title as position_title,
  fs.leadership_score,
  fs.communication_score,
  fs.collaboration_score,
  fs.accountability_score,
  fs.problem_solving_score,
  fs.overall_360_score,
  fs.kpi_score,
  fs.final_score,
  fs.final_grade,
  fs.burnout_risk,
  fs.promotion_potential,
  fc.period_label,
  fs.created_at
FROM feedback_summaries fs
JOIN employees e ON fs.employee_id = e.id
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN positions p ON e.job_title_id = p.id
JOIN feedback_cycles fc ON fs.cycle_id = fc.id;

-- View: Feedback Cycle Progress
CREATE OR REPLACE VIEW v_feedback_cycle_progress AS
SELECT 
  fc.id,
  fc.name,
  fc.period_label,
  fc.status,
  fc.start_date,
  fc.end_date,
  COUNT(DISTINCT fa.employee_id) as total_employees,
  COUNT(DISTINCT CASE WHEN fa.status = 'completed' THEN fa.employee_id END) as completed_count,
  COUNT(DISTINCT CASE WHEN fa.status = 'pending' THEN fa.employee_id END) as pending_count,
  ROUND(COUNT(DISTINCT CASE WHEN fa.status = 'completed' THEN fa.employee_id END)::numeric / 
        NULLIF(COUNT(DISTINCT fa.employee_id), 0) * 100, 2) as completion_percentage
FROM feedback_cycles fc
LEFT JOIN feedback_assignments fa ON fc.id = fa.cycle_id
GROUP BY fc.id, fc.name, fc.period_label, fc.status, fc.start_date, fc.end_date;

-- ============================================================
-- 10. RLS POLICIES
-- ============================================================

ALTER TABLE feedback_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_relationship_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;

-- Allow all for now (can be tightened later)
CREATE POLICY "allow all feedback_categories" ON feedback_categories FOR ALL USING (true);
CREATE POLICY "allow all feedback_criteria" ON feedback_criteria FOR ALL USING (true);
CREATE POLICY "allow all feedback_relationship_types" ON feedback_relationship_types FOR ALL USING (true);
CREATE POLICY "allow all feedback_cycles" ON feedback_cycles FOR ALL USING (true);
CREATE POLICY "allow all feedback_assignments" ON feedback_assignments FOR ALL USING (true);
CREATE POLICY "allow all feedback_responses" ON feedback_responses FOR ALL USING (true);
CREATE POLICY "allow all feedback_summaries" ON feedback_summaries FOR ALL USING (true);
CREATE POLICY "allow all development_plans" ON development_plans FOR ALL USING (true);

-- ============================================================
-- 11. TRIGGERS: Auto-calculate summary scores
-- ============================================================

CREATE OR REPLACE FUNCTION fn_calculate_feedback_summary()
RETURNS trigger AS $$
DECLARE
  v_assignment RECORD;
  v_category_scores RECORD;
  v_leadership_avg numeric := 0;
  v_communication_avg numeric := 0;
  v_collaboration_avg numeric := 0;
  v_accountability_avg numeric := 0;
  v_problem_solving_avg numeric := 0;
  v_review_count integer := 0;
BEGIN
  -- Get the assignment
  SELECT * INTO v_assignment FROM feedback_assignments WHERE id = NEW.assignment_id;
  
  -- Calculate average scores per category for this employee in this cycle
  SELECT 
    AVG(CASE WHEN fc.name = 'Leadership' THEN fr.rating END) as leadership,
    AVG(CASE WHEN fc.name = 'Communication' THEN fr.rating END) as communication,
    AVG(CASE WHEN fc.name = 'Collaboration' THEN fr.rating END) as collaboration,
    AVG(CASE WHEN fc.name = 'Accountability' THEN fr.rating END) as accountability,
    AVG(CASE WHEN fc.name = 'Problem Solving' THEN fr.rating END) as problem_solving,
    COUNT(DISTINCT fr.assignment_id) as cnt
  INTO v_category_scores
  FROM feedback_responses fr
  JOIN feedback_assignments fa ON fr.assignment_id = fa.id
  JOIN feedback_criteria fcr ON fr.criteria_id = fcr.id
  JOIN feedback_categories fc ON fcr.category_id = fc.id
  WHERE fa.cycle_id = v_assignment.cycle_id 
    AND fa.employee_id = v_assignment.employee_id
    AND fa.status = 'completed';
  
  -- Update or create summary
  INSERT INTO feedback_summaries (
    cycle_id, employee_id,
    leadership_score, communication_score, collaboration_score,
    accountability_score, problem_solving_score,
    overall_360_score,
    updated_at
  ) VALUES (
    v_assignment.cycle_id,
    v_assignment.employee_id,
    COALESCE(v_category_scores.leadership, 0),
    COALESCE(v_category_scores.communication, 0),
    COALESCE(v_category_scores.collaboration, 0),
    COALESCE(v_category_scores.accountability, 0),
    COALESCE(v_category_scores.problem_solving, 0),
    COALESCE(
      (COALESCE(v_category_scores.leadership, 0) +
       COALESCE(v_category_scores.communication, 0) +
       COALESCE(v_category_scores.collaboration, 0) +
       COALESCE(v_category_scores.accountability, 0) +
       COALESCE(v_category_scores.problem_solving, 0)) / 5.0,
      0
    ),
    now()
  )
  ON CONFLICT (cycle_id, employee_id) DO UPDATE SET
    leadership_score = COALESCE(v_category_scores.leadership, 0),
    communication_score = COALESCE(v_category_scores.communication, 0),
    collaboration_score = COALESCE(v_category_scores.collaboration, 0),
    accountability_score = COALESCE(v_category_scores.accountability, 0),
    problem_solving_score = COALESCE(v_category_scores.problem_solving, 0),
    overall_360_score = COALESCE(
      (COALESCE(v_category_scores.leadership, 0) +
       COALESCE(v_category_scores.communication, 0) +
       COALESCE(v_category_scores.collaboration, 0) +
       COALESCE(v_category_scores.accountability, 0) +
       COALESCE(v_category_scores.problem_solving, 0)) / 5.0,
      0
    ),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_feedback_summary
  AFTER INSERT OR UPDATE ON feedback_responses
  FOR EACH ROW EXECUTE FUNCTION fn_calculate_feedback_summary();

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE feedback_categories IS '5 behavioral metrics untuk 360° feedback';
COMMENT ON TABLE feedback_criteria IS 'Indikator/criteria per kategori untuk dinilai';
COMMENT ON TABLE feedback_cycles IS 'Periode feedback cycle (Q1, Q2, Annual, dll)';
COMMENT ON TABLE feedback_assignments IS 'Mapping siapa menilai siapa dalam cycle';
COMMENT ON TABLE feedback_responses IS 'Jawaban/rating per criteria dari reviewer';
COMMENT ON TABLE feedback_summaries IS 'Aggregated scores + AI insights per employee';
COMMENT ON TABLE development_plans IS 'Action plan untuk improvement pasca review';
