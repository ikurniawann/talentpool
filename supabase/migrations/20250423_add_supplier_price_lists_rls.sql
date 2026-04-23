-- ============================================
-- FIX: Add RLS policies for supplier_price_lists
-- Date: 2025-04-23
-- Description: Enable RLS and add policies for CRUD operations
-- ============================================

-- Enable RLS on supplier_price_lists table
ALTER TABLE supplier_price_lists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all active price lists" ON supplier_price_lists;
DROP POLICY IF EXISTS "Users can create price lists" ON supplier_price_lists;
DROP POLICY IF EXISTS "Users can update price lists" ON supplier_price_lists;
DROP POLICY IF EXISTS "Users can delete price lists" ON supplier_price_lists;

-- Policy: View all active price lists (authenticated users)
CREATE POLICY "Users can view all active price lists"
  ON supplier_price_lists
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Policy: View all price lists (including inactive) for admins
CREATE POLICY "Admins can view all price lists"
  ON supplier_price_lists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Policy: Create new price lists
CREATE POLICY "Users can create price lists"
  ON supplier_price_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Policy: Update price lists
CREATE POLICY "Users can update price lists"
  ON supplier_price_lists
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Policy: Delete price lists (soft delete via update)
CREATE POLICY "Users can delete price lists"
  ON supplier_price_lists
  FOR UPDATE
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON supplier_price_lists TO authenticated;

-- Comment
COMMENT ON POLICY "Users can view all active price lists" ON supplier_price_lists IS 'Allow authenticated users to view active price lists';
COMMENT ON POLICY "Users can create price lists" ON supplier_price_lists IS 'Allow authenticated users to create new price lists';
COMMENT ON POLICY "Users can update price lists" ON supplier_price_lists IS 'Allow authenticated users to update price lists';
COMMENT ON POLICY "Users can delete price lists" ON supplier_price_lists IS 'Allow authenticated users to soft delete price lists';
