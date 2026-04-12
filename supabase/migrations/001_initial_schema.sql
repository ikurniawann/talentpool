-- ============================================================
-- Talent Pool & Recruitment System
-- Initial Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Brands (outlets / subsidiaries)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'F&B',
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Positions (job titles per brand)
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Operations',
  level TEXT NOT NULL DEFAULT 'Staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hrd', 'hiring_manager', 'direksi')),
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidates
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  domicile TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('portal', 'internal', 'referral', 'jobstreet', 'instagram', 'jobfair', 'other')),
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  cv_url TEXT,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'screening', 'interview_hrd', 'interview_manager', 'talent_pool', 'hired', 'rejected')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hrd', 'hiring_manager')),
  scorecard JSONB,
  recommendation TEXT CHECK (recommendation IN ('proceed', 'pool', 'reject')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications Log
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_brand ON candidates(brand_id);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_candidates_created_by ON candidates(created_by);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_positions_brand ON positions(brand_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: get user's brand
CREATE OR REPLACE FUNCTION get_user_brand()
RETURNS UUID AS $$
  SELECT brand_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: check if HRD
CREATE OR REPLACE FUNCTION is_hrd()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'hrd';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Brands policies
CREATE POLICY "HRD can do everything on brands"
  ON brands FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Everyone can read brands"
  ON brands FOR SELECT
  USING (true);

-- Positions policies
CREATE POLICY "HRD can do everything on positions"
  ON positions FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Hiring manager can read positions of their brand"
  ON positions FOR SELECT
  USING (
    get_user_role() IN ('hiring_manager', 'direksi')
    AND (brand_id = get_user_brand() OR get_user_role() = 'direksi')
  );

-- Users policies
CREATE POLICY "HRD can manage users"
  ON users FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Direksi can read all users"
  ON users FOR SELECT
  USING (get_user_role() = 'direksi');

-- Candidates policies
CREATE POLICY "HRD full access to candidates"
  ON candidates FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Hiring manager can read candidates of their brand"
  ON candidates FOR SELECT
  USING (
    get_user_role() = 'hiring_manager'
    AND (brand_id = get_user_brand() OR brand_id IS NULL)
  );

CREATE POLICY "Hiring manager can update candidates of their brand"
  ON candidates FOR UPDATE
  USING (
    get_user_role() = 'hiring_manager'
    AND (brand_id = get_user_brand() OR brand_id IS NULL)
  );

CREATE POLICY "Direksi can read all candidates"
  ON candidates FOR SELECT
  USING (get_user_role() = 'direksi');

-- Interviews policies
CREATE POLICY "HRD full access to interviews"
  ON interviews FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Hiring manager can read interviews for their brand"
  ON interviews FOR SELECT
  USING (
    get_user_role() = 'hiring_manager'
    AND candidate_id IN (
      SELECT id FROM candidates WHERE brand_id = get_user_brand() OR brand_id IS NULL
    )
  );

CREATE POLICY "Hiring manager can insert/update interviews for their brand"
  ON interviews FOR INSERT
  WITH CHECK (
    get_user_role() = 'hiring_manager'
    AND candidate_id IN (
      SELECT id FROM candidates WHERE brand_id = get_user_brand() OR brand_id IS NULL
    )
  );

CREATE POLICY "Hiring manager can update interviews for their brand"
  ON interviews FOR UPDATE
  USING (
    get_user_role() = 'hiring_manager'
    AND candidate_id IN (
      SELECT id FROM candidates WHERE brand_id = get_user_brand() OR brand_id IS NULL
    )
  );

CREATE POLICY "Direksi can read all interviews"
  ON interviews FOR SELECT
  USING (get_user_role() = 'direksi');

-- Notifications policies
CREATE POLICY "HRD can manage notifications"
  ON notifications_log FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Hiring manager can read notifications for their brand"
  ON notifications_log FOR SELECT
  USING (
    get_user_role() = 'hiring_manager'
    AND candidate_id IN (
      SELECT id FROM candidates WHERE brand_id = get_user_brand() OR brand_id IS NULL
    )
  );

CREATE POLICY "Direksi can read notifications"
  ON notifications_log FOR SELECT
  USING (get_user_role() = 'direksi');

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on candidates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
