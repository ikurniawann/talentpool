-- ============================================
-- FIX: Grant permissions for supplier_price_lists
-- Date: 2025-04-23
-- Description: Fix permission issues for authenticated users
-- ============================================

-- Grant all permissions on supplier_price_lists to authenticated users
GRANT ALL ON TABLE supplier_price_lists TO authenticated;

-- Make sure RLS is enabled but permissive
ALTER TABLE supplier_price_lists FORCE ROW LEVEL SECURITY;

-- Drop and recreate policies with simpler approach
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON supplier_price_lists;
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON supplier_price_lists;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON supplier_price_lists;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON supplier_price_lists;

-- Allow authenticated users to do everything
CREATE POLICY "authenticated_users_insert"
  ON supplier_price_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_users_select"
  ON supplier_price_lists
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_users_update"
  ON supplier_price_lists
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_users_delete"
  ON supplier_price_lists
  FOR DELETE
  TO authenticated
  USING (true);

-- Also grant on view
GRANT SELECT ON v_supplier_price_lists TO authenticated;

-- Comment
COMMENT ON POLICY "authenticated_users_insert" ON supplier_price_lists IS 'Allow authenticated users to insert';
COMMENT ON POLICY "authenticated_users_select" ON supplier_price_lists IS 'Allow authenticated users to select';
COMMENT ON POLICY "authenticated_users_update" ON supplier_price_lists IS 'Allow authenticated users to update';
COMMENT ON POLICY "authenticated_users_delete" ON supplier_price_lists IS 'Allow authenticated users to delete';
