-- ============================================================
-- HRIS Fase 1 - Fix: RLS Helper Functions
-- ============================================================
-- Fix untuk error: function current_user_brand_ids() does not exist
-- Migration ini menambahkan helper functions yang dibutuhkan RLS policies
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================

-- Helper function: Check if current user is HRD
CREATE OR REPLACE FUNCTION is_hrd()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_role = 'hrd', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current user is manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_role IN ('hrd', 'hiring_manager'), false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user's employee ID
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  SELECT id INTO v_employee_id
  FROM employees
  WHERE user_id = auth.uid();
  
  RETURN v_employee_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user's brand IDs (array)
CREATE OR REPLACE FUNCTION current_user_brand_ids()
RETURNS UUID[] AS $$
DECLARE
  v_brand_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(brand_id) INTO v_brand_ids
  FROM users
  WHERE id = auth.uid() AND brand_id IS NOT NULL;
  
  RETURN COALESCE(v_brand_ids, ARRAY[]::UUID[]);
EXCEPTION
  WHEN OTHERS THEN
    RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VERIFY FUNCTIONS CREATED
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'HRIS RLS Helper Functions Created:';
  RAISE NOTICE '  - is_hrd()';
  RAISE NOTICE '  - is_manager()';
  RAISE NOTICE '  - current_employee_id()';
  RAISE NOTICE '  - current_user_brand_ids()';
END $$;

-- ============================================================
-- END OF FIX MIGRATION
-- ============================================================
