-- ============================================================
-- HRIS Fase 1 - Simplified RLS Policies (Fallback)
-- ============================================================
-- Alternative RLS policies yang lebih simple jika helper functions gagal
-- Gunakan ini JIKA migration sebelumnya error karena missing functions
-- ============================================================

-- ============================================================
-- OPTION 1: SIMPLE RLS - Based on role only (no brand filtering)
-- ============================================================
-- Uncomment section ini jika ingin menggunakan simplified version

-- -- Attendance RLS (Simple)
-- DROP POLICY IF EXISTS "HRD full access to attendance" ON attendance;
-- CREATE POLICY "HRD full access to attendance"
--   ON attendance FOR ALL
--   USING (is_hrd() = true);

-- DROP POLICY IF EXISTS "Manager read attendance in department" ON attendance;
-- CREATE POLICY "Manager read attendance in department"
--   ON attendance FOR SELECT
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Employee read self attendance" ON attendance;
-- CREATE POLICY "Employee read self attendance"
--   ON attendance FOR SELECT
--   USING (employee_id = current_employee_id());

-- DROP POLICY IF EXISTS "Employee clock in/out" ON attendance;
-- CREATE POLICY "Employee clock in/out"
--   ON attendance FOR INSERT
--   WITH CHECK (employee_id = current_employee_id());

-- DROP POLICY IF EXISTS "Employee update own clock_out" ON attendance;
-- CREATE POLICY "Employee update own clock_out"
--   ON attendance FOR UPDATE
--   USING (employee_id = current_employee_id());

-- -- Leaves RLS (Simple)
-- DROP POLICY IF EXISTS "HRD full access to leaves" ON leaves;
-- CREATE POLICY "HRD full access to leaves"
--   ON leaves FOR ALL
--   USING (is_hrd() = true);

-- DROP POLICY IF EXISTS "Manager read leaves in department" ON leaves;
-- CREATE POLICY "Manager read leaves in department"
--   ON leaves FOR SELECT
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Manager approve leaves" ON leaves;
-- CREATE POLICY "Manager approve leaves"
--   ON leaves FOR UPDATE
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Employee read self leaves" ON leaves;
-- CREATE POLICY "Employee read self leaves"
--   ON leaves FOR SELECT
--   USING (employee_id = current_employee_id());

-- DROP POLICY IF EXISTS "Employee create leave request" ON leaves;
-- CREATE POLICY "Employee create leave request"
--   ON leaves FOR INSERT
--   WITH CHECK (employee_id = current_employee_id());

-- -- Leave Balances RLS (Simple)
-- DROP POLICY IF EXISTS "HRD full access to leave_balances" ON leave_balances;
-- CREATE POLICY "HRD full access to leave_balances"
--   ON leave_balances FOR ALL
--   USING (is_hrd() = true);

-- DROP POLICY IF EXISTS "Manager read leave_balances in department" ON leave_balances;
-- CREATE POLICY "Manager read leave_balances in department"
--   ON leave_balances FOR SELECT
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Employee read self leave_balances" ON leave_balances;
-- CREATE POLICY "Employee read self leave_balances"
--   ON leave_balances FOR SELECT
--   USING (employee_id = current_employee_id());

-- -- Onboarding Checklists RLS (Simple)
-- DROP POLICY IF EXISTS "HRD full access to onboarding_checklists" ON onboarding_checklists;
-- CREATE POLICY "HRD full access to onboarding_checklists"
--   ON onboarding_checklists FOR ALL
--   USING (is_hrd() = true);

-- DROP POLICY IF EXISTS "Manager read onboarding in department" ON onboarding_checklists;
-- CREATE POLICY "Manager read onboarding in department"
--   ON onboarding_checklists FOR SELECT
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Manager update onboarding" ON onboarding_checklists;
-- CREATE POLICY "Manager update onboarding"
--   ON onboarding_checklists FOR UPDATE
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Employee read self onboarding" ON onboarding_checklists;
-- CREATE POLICY "Employee read self onboarding"
--   ON onboarding_checklists FOR SELECT
--   USING (employee_id = current_employee_id());

-- -- Offboarding Checklists RLS (Simple)
-- DROP POLICY IF EXISTS "HRD full access to offboarding_checklists" ON offboarding_checklists;
-- CREATE POLICY "HRD full access to offboarding_checklists"
--   ON offboarding_checklists FOR ALL
--   USING (is_hrd() = true);

-- DROP POLICY IF EXISTS "Manager read offboarding in department" ON offboarding_checklists;
-- CREATE POLICY "Manager read offboarding in department"
--   ON offboarding_checklists FOR SELECT
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Manager update offboarding" ON offboarding_checklists;
-- CREATE POLICY "Manager update offboarding"
--   ON offboarding_checklists FOR UPDATE
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Employee read self offboarding" ON offboarding_checklists;
-- CREATE POLICY "Employee read self offboarding"
--   ON offboarding_checklists FOR SELECT
--   USING (employee_id = current_employee_id());

-- -- Employee Schedules RLS (Simple)
-- DROP POLICY IF EXISTS "HRD full access to employee_schedules" ON employee_schedules;
-- CREATE POLICY "HRD full access to employee_schedules"
--   ON employee_schedules FOR ALL
--   USING (is_hrd() = true);

-- DROP POLICY IF EXISTS "Manager read employee_schedules in department" ON employee_schedules;
-- CREATE POLICY "Manager read employee_schedules in department"
--   ON employee_schedules FOR SELECT
--   USING (is_manager() = true);

-- DROP POLICY IF EXISTS "Employee read self schedule" ON employee_schedules;
-- CREATE POLICY "Employee read self schedule"
--   ON employee_schedules FOR SELECT
--   USING (employee_id = current_employee_id());

-- ============================================================
-- OPTION 2: SUPER ADMIN MODE - Disable RLS temporarily for testing
-- ============================================================
-- Uncomment section ini HANYA untuk testing/development
-- TIDAK UNTUK PRODUCTION!

-- -- Disable RLS temporarily (development only!)
-- ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leaves DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_balances DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE onboarding_checklists DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE offboarding_checklists DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_schedules DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- Run this to check if helper functions exist:

-- SELECT 
--   routine_name, 
--   data_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name IN (
--   'is_hrd', 
--   'is_manager', 
--   'current_employee_id', 
--   'current_user_brand_ids'
-- );

-- ============================================================
-- END OF SIMPLIFIED RLS MIGRATION
-- ============================================================
