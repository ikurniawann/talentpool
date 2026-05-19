-- ============================================================
-- Migration 009: Void Order + Table Management + Supervisor PIN
-- ============================================================

-- 1. Update users.role CHECK constraint to include pos_supervisor
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
    role IN (
      'super_admin', 'hrd', 'hiring_manager', 'direksi',
      'purchasing_admin', 'purchasing_manager', 'purchasing_staff',
      'finance_staff', 'warehouse_staff', 'warehouse_admin',
      'pos', 'admin', 'qc_staff', 'pos_supervisor'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
END $$;

-- 2. Supervisor PIN (4-6 digit numeric)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pos_pin TEXT;
CREATE INDEX IF NOT EXISTS idx_users_pos_role_pin ON users(role, pos_pin) WHERE role = 'pos_supervisor';

-- 2b. Defensive: ensure pos_orders.table_id exists for table management
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS table_id TEXT;

-- 3. Void tracking on pos_orders
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- 4. Merge tracking on pos_orders
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS merged_to_order_id UUID REFERENCES pos_orders(id) ON DELETE SET NULL;
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS merged_from_orders UUID[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_pos_orders_merged_to ON pos_orders(merged_to_order_id);

-- 5. Add enum values safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'voided'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pos_order_status')
  ) THEN
    ALTER TYPE pos_order_status ADD VALUE 'voided';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'merged'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'pos_order_status')
  ) THEN
    ALTER TYPE pos_order_status ADD VALUE 'merged';
  END IF;
END $$;

-- 6. Index for active table occupancy (avoid referencing new enum values in same tx)
CREATE INDEX IF NOT EXISTS idx_pos_orders_table_active ON pos_orders(table_id, status)
WHERE status IN ('pending', 'confirmed', 'preparing', 'ready', 'served');

-- 7. Helper: validate supervisor PIN
CREATE OR REPLACE FUNCTION pos_validate_supervisor_pin(p_pin TEXT)
RETURNS TABLE(user_id UUID, full_name TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.full_name, u.role
  FROM users u
  WHERE u.role = 'pos_supervisor'
    AND u.pos_pin = p_pin
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Helper: check table availability (compare as text to avoid enum parse in same tx)
CREATE OR REPLACE FUNCTION pos_is_table_available(p_table_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM pos_orders
    WHERE table_id = p_table_id
      AND status::TEXT IN ('pending', 'confirmed', 'preparing', 'ready', 'served')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: void an order
CREATE OR REPLACE FUNCTION pos_void_order(
  p_order_id UUID,
  p_reason TEXT,
  p_supervisor_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM pos_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status::TEXT = 'voided' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already voided');
  END IF;

  IF v_order.status::TEXT = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot void completed order');
  END IF;

  IF v_order.status::TEXT = 'merged' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot void merged order');
  END IF;

  UPDATE pos_orders SET
    status = 'voided',
    voided_at = NOW(),
    voided_by = p_supervisor_id,
    void_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_order_id;

  -- If order was split, mark remaining unpaid splits as cancelled
  UPDATE pos_order_splits SET
    status = 'cancelled',
    updated_at = NOW()
  WHERE order_id = p_order_id AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'message', 'Order voided successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: merge order A into order B
CREATE OR REPLACE FUNCTION pos_merge_orders(
  p_source_order_id UUID,
  p_target_order_id UUID,
  p_supervisor_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_source RECORD;
  v_target RECORD;
BEGIN
  IF p_source_order_id = p_target_order_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot merge order with itself');
  END IF;

  SELECT * INTO v_source FROM pos_orders WHERE id = p_source_order_id;
  SELECT * INTO v_target FROM pos_orders WHERE id = p_target_order_id;

  IF NOT FOUND(v_source) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source order not found');
  END IF;
  IF NOT FOUND(v_target) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target order not found');
  END IF;

  IF v_source.status::TEXT IN ('completed', 'cancelled', 'voided', 'merged') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source order cannot be merged');
  END IF;
  IF v_target.status::TEXT IN ('completed', 'cancelled', 'voided', 'merged') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target order cannot receive merge');
  END IF;

  -- Move items from source to target
  UPDATE pos_order_items SET order_id = p_target_order_id WHERE order_id = p_source_order_id;

  -- Recalculate target totals
  UPDATE pos_orders SET
    subtotal = COALESCE((SELECT SUM(subtotal) FROM pos_order_items WHERE order_id = p_target_order_id), 0),
    total_amount = COALESCE((SELECT SUM(total_amount) FROM pos_order_items WHERE order_id = p_target_order_id), 0),
    discount_amount = COALESCE(discount_amount, 0) + COALESCE(v_source.discount_amount, 0),
    tax_amount = COALESCE(tax_amount, 0) + COALESCE(v_source.tax_amount, 0),
    updated_at = NOW()
  WHERE id = p_target_order_id;

  -- Mark source as merged
  UPDATE pos_orders SET
    status = 'merged',
    merged_to_order_id = p_target_order_id,
    updated_at = NOW(),
    payment_status = 'refunded'
  WHERE id = p_source_order_id;

  -- Track merge history on target
  UPDATE pos_orders SET
    merged_from_orders = array_append(COALESCE(merged_from_orders, '{}'), p_source_order_id)
  WHERE id = p_target_order_id;

  -- Cancel any pending splits on source
  UPDATE pos_order_splits SET status = 'cancelled', updated_at = NOW()
  WHERE order_id = p_source_order_id AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'source_order_id', p_source_order_id,
    'target_order_id', p_target_order_id,
    'message', 'Orders merged successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: move order to another table / change type
CREATE OR REPLACE FUNCTION pos_move_order_table(
  p_order_id UUID,
  p_new_table_id TEXT,
  p_new_order_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_table_available BOOLEAN;
BEGIN
  SELECT * INTO v_order FROM pos_orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status::TEXT IN ('completed', 'cancelled', 'voided', 'merged') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot move finished order');
  END IF;

  -- Check table availability if moving to a dine-in table
  IF p_new_table_id IS NOT NULL THEN
    v_table_available := pos_is_table_available(p_new_table_id);
    IF NOT v_table_available THEN
      RETURN jsonb_build_object('success', false, 'error', 'Table is occupied');
    END IF;
  END IF;

  UPDATE pos_orders SET
    table_id = p_new_table_id,
    order_type = COALESCE(p_new_order_type, v_order.order_type),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'new_table_id', p_new_table_id,
    'new_order_type', COALESCE(p_new_order_type, v_order.order_type),
    'message', 'Order moved successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
