-- ============================================================
-- Job Portal Openings
-- Controls which openings are published to /career.
-- ============================================================

CREATE TABLE IF NOT EXISTS job_openings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT 'Operations',
  location TEXT NOT NULL DEFAULT 'Jakarta, ID',
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  work_mode TEXT NOT NULL DEFAULT 'On-site',
  headcount INTEGER NOT NULL DEFAULT 1 CHECK (headcount > 0),
  description TEXT,
  requirements TEXT,
  benefits TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  published_at TIMESTAMPTZ,
  closing_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS job_opening_id UUID REFERENCES job_openings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_openings_status ON job_openings(status);
CREATE INDEX IF NOT EXISTS idx_job_openings_slug ON job_openings(slug);
CREATE INDEX IF NOT EXISTS idx_job_openings_position ON job_openings(position_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_brand ON job_openings(brand_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_department ON job_openings(department_id);
CREATE INDEX IF NOT EXISTS idx_candidates_job_opening ON candidates(job_opening_id);

CREATE OR REPLACE FUNCTION update_job_openings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_openings_updated_at ON job_openings;
CREATE TRIGGER job_openings_updated_at
  BEFORE UPDATE ON job_openings
  FOR EACH ROW
  EXECUTE FUNCTION update_job_openings_updated_at();

ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published job openings" ON job_openings;
CREATE POLICY "Public can read published job openings"
  ON job_openings FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "HRD can manage job openings" ON job_openings;
CREATE POLICY "HRD can manage job openings"
  ON job_openings FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);
