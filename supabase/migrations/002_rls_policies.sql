-- ============================================================
-- Migration: 002_rls_policies
-- Enable Row Level Security for all tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BRANDS: anyone authenticated can read
-- ============================================================
CREATE POLICY "brands_select_authenticated"
  ON brands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "brands_insert_hrd_only"
  ON brands FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'hrd'
    )
  );

CREATE POLICY "brands_update_hrd_only"
  ON brands FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'hrd'
    )
  );

-- ============================================================
-- POSITIONS: anyone authenticated can read
-- ============================================================
CREATE POLICY "positions_select_authenticated"
  ON positions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "positions_insert_hrd_only"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'hrd'
    )
  );

CREATE POLICY "positions_update_hrd_only"
  ON positions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'hrd'
    )
  );

-- ============================================================
-- USERS: users can read their own profile; HRD can read all
-- ============================================================
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_select_all_hrd"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'hrd'
    )
  );

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- CANDIDATES
-- Public can INSERT (portal form submission)
-- HRD can do everything
-- Hiring manager can only see/update their brand's candidates
-- ============================================================

-- Public insert (portal form)
CREATE POLICY "candidates_insert_public"
  ON candidates FOR INSERT
  TO public
  WITH CHECK (true);

-- Authenticated users can SELECT
-- Fine-grained filtering is done at API level
CREATE POLICY "candidates_select_authenticated"
  ON candidates FOR SELECT
  TO authenticated
  USING (true);

-- HRD can INSERT (manual input from HRD dashboard)
CREATE POLICY "candidates_insert_hrd"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('hrd', 'hiring_manager', 'direksi')
    )
  );

-- HRD can UPDATE all candidates
CREATE POLICY "candidates_update_hrd"
  ON candidates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'hrd'
    )
  );

-- HRD can DELETE candidates
CREATE POLICY "candidates_delete_hrd"
  ON candidates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'hrd'
    )
  );

-- ============================================================
-- INTERVIEWS: anyone authenticated can read
-- HRD and hiring_manager can INSERT/UPDATE
-- ============================================================
CREATE POLICY "interviews_select_authenticated"
  ON interviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "interviews_insert_interviewers"
  ON interviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('hrd', 'hiring_manager')
    )
  );

CREATE POLICY "interviews_update_interviewers"
  ON interviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('hrd', 'hiring_manager')
    )
  );

-- ============================================================
-- NOTIFICATION_LOGS: readable by HRD, insertable by system
-- ============================================================
CREATE POLICY "notification_logs_select_hrd"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'hrd'
    )
  );

CREATE POLICY "notification_logs_insert_authenticated"
  ON notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
