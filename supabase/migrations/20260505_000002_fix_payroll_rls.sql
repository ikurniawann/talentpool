-- ============================================================
-- Fix Payroll RLS Policies
-- Issue: Using wrong column name (should be user_id, not auth_id)
-- Date: 2026-05-05
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "HRD and Finance can view payroll runs" ON payroll_runs;
DROP POLICY IF EXISTS "HRD and Finance can manage payroll runs" ON payroll_runs;
DROP POLICY IF EXISTS "HRD and Finance can view payroll details" ON payroll_details;
DROP POLICY IF EXISTS "HRD and Finance can manage payroll details" ON payroll_details;

-- Create corrected policies using is_hrd() helper function
CREATE POLICY "HRD and Finance can view payroll runs"
ON payroll_runs FOR SELECT
TO authenticated
USING (
  is_hrd()
);

CREATE POLICY "HRD and Finance can manage payroll runs"
ON payroll_runs FOR ALL
TO authenticated
USING (
  is_hrd()
)
WITH CHECK (
  is_hrd()
);

-- Payroll Details: HRD can manage, employees can view own
CREATE POLICY "HRD and Finance can view payroll details"
ON payroll_details FOR SELECT
TO authenticated
USING (
  is_hrd()
  OR
  employee_id = current_employee_id()
);

CREATE POLICY "HRD and Finance can manage payroll details"
ON payroll_details FOR ALL
TO authenticated
USING (
  is_hrd()
)
WITH CHECK (
  is_hrd()
);

-- Also fix payroll_settings policies
DROP POLICY IF EXISTS "HRD and Finance can view payroll settings" ON payroll_settings;

CREATE POLICY "HRD and Finance can view payroll settings"
ON payroll_settings FOR SELECT
TO authenticated
USING (
  is_hrd()
);

-- Also fix employee_salary policies
DROP POLICY IF EXISTS "Employees can view own salary" ON employee_salary;
DROP POLICY IF EXISTS "HRD and Finance can manage employee salary" ON employee_salary;

CREATE POLICY "Employees can view own salary"
ON employee_salary FOR SELECT
TO authenticated
USING (
  employee_id = current_employee_id()
  OR
  is_hrd()
);

CREATE POLICY "HRD and Finance can manage employee salary"
ON employee_salary FOR ALL
TO authenticated
USING (
  is_hrd()
)
WITH CHECK (
  is_hrd()
);
