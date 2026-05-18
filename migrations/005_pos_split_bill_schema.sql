-- Migration: 005_pos_split_bill_schema
-- Implements Phase 1 Split Bill: Equal splits only
-- Note: pos_order_splits, pos_order_split_items, pos_split_payments added

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE pos_split_status AS ENUM ('pending', 'paid', 'partial', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_order_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  split_index INTEGER NOT NULL,
  label TEXT DEFAULT '',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash','qris','debit','credit','ark_coin')),
  status pos_split_status NOT NULL DEFAULT 'pending',
  customer_id UUID REFERENCES pos_customers(id),
  ark_coins_used NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  UNIQUE(order_id, split_index)
);

CREATE TABLE IF NOT EXISTS pos_order_split_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES pos_order_splits(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES pos_order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(split_id, order_item_id)
);

CREATE TABLE IF NOT EXISTS pos_split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES pos_order_splits(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  cashier_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pos_order_splits_order ON pos_order_splits(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_split_payments_split ON pos_split_payments(split_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_splits_status ON pos_order_splits(status);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE pos_order_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_order_split_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_split_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pos_order_splits' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON pos_order_splits FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pos_order_split_items' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON pos_order_split_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pos_split_payments' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON pos_split_payments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- RPC: pos_create_split_order_transaction
-- Creates order + items + splits (Phase 1: equal only, no per-item mappings inserted)
-- Split metadata only; items remain in pos_order_items for kitchen.
-- ============================================================
CREATE OR REPLACE FUNCTION pos_create_split_order_transaction(
  p_order_type TEXT,
  p_cashier_id TEXT,
  p_customer_id UUID DEFAULT NULL,
  p_server_id TEXT DEFAULT NULL,
  p_table_id TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]',
  p_subtotal NUMERIC DEFAULT 0,
  p_discount_amount NUMERIC DEFAULT 0,
  p_discount_reason TEXT DEFAULT NULL,
  p_tax_amount NUMERIC DEFAULT 0,
  p_service_charge_amount NUMERIC DEFAULT 0,
  p_total_amount NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_special_requests TEXT DEFAULT NULL,
  p_splits JSONB DEFAULT '[]',
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
  v_item_id UUID;
  v_split JSONB;
  v_split_id UUID;
  v_split_index INTEGER := 0;
  v_sum_splits NUMERIC(12,2) := 0;
BEGIN
  -- Validate splits exist
  IF jsonb_array_length(p_splits) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'splits array cannot be empty for split bill'
    );
  END IF;

  -- Validate sum of splits equals total
  SELECT COALESCE(SUM((value->>'total_amount')::NUMERIC), 0)
  INTO v_sum_splits
  FROM jsonb_array_elements(p_splits);

  IF v_sum_splits != p_total_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Splits total (%.2f) does not match order total (%.2f)', v_sum_splits, p_total_amount)
    );
  END IF;

  -- Generate order number
  v_order_number := generate_order_number();

  -- Insert order (payment_status = unpaid; amount_paid = 0)
  INSERT INTO pos_orders (
    order_number, order_type, status, payment_status,
    customer_id, cashier_id, server_id, branch_id, table_id,
    subtotal, discount_amount, discount_reason,
    tax_amount, service_charge_amount, total_amount,
    amount_paid, change_amount, notes, special_requests,
    ordered_at
  ) VALUES (
    v_order_number, p_order_type, 'pending', 'unpaid',
    p_customer_id, p_cashier_id, p_server_id, p_branch_id, p_table_id,
    p_subtotal, p_discount_amount, p_discount_reason,
    p_tax_amount, p_service_charge_amount, p_total_amount,
    0, 0, p_notes, p_special_requests, now()
  ) RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO pos_order_items (
      order_id, product_id, product_name, product_sku,
      variant_info, modifier_info, quantity,
      unit_price, subtotal, total_amount, notes
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      v_item->>'product_sku',
      v_item->>'variant_info',
      v_item->>'modifier_info',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'subtotal')::NUMERIC,
      (v_item->>'total_amount')::NUMERIC,
      v_item->>'notes'
    ) RETURNING id INTO v_item_id;
  END LOOP;

  -- Insert splits (equal metadata only)
  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    v_split_index := v_split_index + 1;
    INSERT INTO pos_order_splits (
      order_id,
      split_index,
      label,
      subtotal,
      tax_amount,
      discount_amount,
      total_amount,
      customer_id,
      status
    ) VALUES (
      v_order_id,
      v_split_index,
      COALESCE(v_split->>'label', 'Split ' || v_split_index),
      COALESCE((v_split->>'subtotal')::NUMERIC, 0),
      COALESCE((v_split->>'tax_amount')::NUMERIC, 0),
      COALESCE((v_split->>'discount_amount')::NUMERIC, 0),
      (v_split->>'total_amount')::NUMERIC,
      (v_split->>'customer_id')::UUID,
      'pending'
    ) RETURNING id INTO v_split_id;
  END LOOP;

  -- Audit trail
  INSERT INTO pos_order_status_history (order_id, status, reason)
  VALUES (v_order_id, 'pending', 'Split bill order created: ' || jsonb_array_length(p_splits) || ' bill(s)');

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'split_count', jsonb_array_length(p_splits)
  );
END;
$$;

-- ============================================================
-- RPC: pos_pay_split_transaction
-- Atomic payment for a single split.
-- ============================================================
CREATE OR REPLACE FUNCTION pos_pay_split_transaction(
  p_split_id UUID,
  p_payment_method TEXT,
  p_amount_paid NUMERIC,
  p_ark_coins_used NUMERIC DEFAULT 0,
  p_cashier_id TEXT DEFAULT 'system',
  p_reference_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split_record RECORD;
  v_order_id UUID;
  v_remaining NUMERIC(12,2);
  v_customer_id UUID;
  v_cust_balance NUMERIC(12,2);
  v_change NUMERIC(12,2);
  v_all_paid_count INTEGER;
  v_total_splits INTEGER;
BEGIN
  -- Lock split and order for update
  SELECT s.* INTO v_split_record
  FROM pos_order_splits s
  WHERE s.id = p_split_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split not found');
  END IF;

  IF v_split_record.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split already cancelled');
  END IF;

  IF v_split_record.status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split already paid');
  END IF;

  v_order_id := v_split_record.order_id;

  -- Check amount paid >= total_amount
  IF p_amount_paid < v_split_record.total_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Amount paid %.0f is less than split total %.0f', p_amount_paid, v_split_record.total_amount)
    );
  END IF;

  v_change := p_amount_paid - v_split_record.total_amount;
  v_customer_id := v_split_record.customer_id;

  -- ARK Coin validation and deduction
  IF p_ark_coins_used > 0 THEN
    IF v_customer_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot use ARK Coin without member customer');
    END IF;

    PERFORM id FROM pos_customers WHERE id = v_customer_id FOR UPDATE;

    SELECT ark_coin_balance INTO v_cust_balance FROM pos_customers WHERE id = v_customer_id;
    IF v_cust_balance < p_ark_coins_used THEN
      RETURN jsonb_build_object('success', false, 'error', format('ARK Coin balance insufficient: %.0f needed, %.0f available', p_ark_coins_used, v_cust_balance));
    END IF;

    -- Deduct ARK
    UPDATE pos_customers
    SET ark_coin_balance = ark_coin_balance - p_ark_coins_used
    WHERE id = v_customer_id;

    INSERT INTO pos_xp_transactions (customer_id, xp_amount, type, description, related_order_id)
    VALUES (v_customer_id, 0, 'ark_used', 'ARK Coin used for split payment: ' || v_split_record.label, v_order_id);
  END IF;

  -- Insert split payment audit
  INSERT INTO pos_split_payments (
    split_id, order_id, amount, change_amount, payment_method, reference_number, cashier_id
  ) VALUES (
    p_split_id, v_order_id, p_amount_paid, v_change, p_payment_method, p_reference_number, p_cashier_id
  );

  -- Update split to paid
  UPDATE pos_order_splits
  SET status = 'paid',
      payment_method = p_payment_method,
      amount_paid = p_amount_paid,
      change_amount = v_change,
      ark_coins_used = p_ark_coins_used,
      paid_at = now()
  WHERE id = p_split_id;

  -- Update order payment status
  SELECT COUNT(*) INTO v_total_splits FROM pos_order_splits WHERE order_id = v_order_id;
  SELECT COUNT(*) INTO v_all_paid_count FROM pos_order_splits WHERE order_id = v_order_id AND status = 'paid';

  IF v_all_paid_count = v_total_splits THEN
    UPDATE pos_orders
    SET payment_status = 'paid',
        completed_at = now()
    WHERE id = v_order_id;
  ELSEIF v_all_paid_count >= 1 THEN
    UPDATE pos_orders
    SET payment_status = 'partially_paid'
    WHERE id = v_order_id;
  END IF;

  -- Audit
  INSERT INTO pos_order_status_history (order_id, status, reason)
  VALUES (v_order_id, 'payment_received', format('Split %s paid via %s', v_split_record.label, p_payment_method));

  RETURN jsonb_build_object(
    'success', true,
    'split_id', p_split_id,
    'change', v_change,
    'paid_splits', v_all_paid_count,
    'total_splits', v_total_splits
  );
END;
$$;

-- ============================================================
-- RPC: pos_cancel_split
-- Cancel a pending split (e.g., cashier input wrong)
-- ============================================================
CREATE OR REPLACE FUNCTION pos_cancel_split(
  p_split_id UUID,
  p_cashier_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split RECORD;
  v_order_id UUID;
BEGIN
  SELECT * INTO v_split FROM pos_order_splits WHERE id = p_split_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Split not found');
  END IF;

  IF v_split.status IN ('paid', 'partial') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel paid split');
  END IF;

  v_order_id := v_split.order_id;
  UPDATE pos_order_splits SET status = 'cancelled' WHERE id = p_split_id;

  INSERT INTO pos_order_status_history (order_id, status, reason)
  VALUES (v_order_id, 'split_cancelled', format('Split %s cancelled', v_split.label));

  RETURN jsonb_build_object('success', true, 'split_id', p_split_id);
END;
$$;

-- ============================================================
-- RPC: pos_get_order_splits
-- List all splits for an order with aggregate payment summary
-- ============================================================
CREATE OR REPLACE FUNCTION pos_get_order_splits(p_order_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'success', true,
    'splits', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'label', s.label,
        'split_index', s.split_index,
        'total_amount', s.total_amount,
        'amount_paid', s.amount_paid,
        'change_amount', s.change_amount,
        'tax_amount', s.tax_amount,
        'discount_amount', s.discount_amount,
        'payment_method', s.payment_method,
        'status', s.status,
        'customer_id', s.customer_id,
        'ark_coins_used', s.ark_coins_used,
        'paid_at', s.paid_at,
        'created_at', s.created_at
      ) ORDER BY s.split_index
    ), '[]'::jsonb),
    'total_paid', (
      SELECT COALESCE(SUM(amount_paid), 0) FROM pos_order_splits WHERE order_id = p_order_id AND status = 'paid'
    ),
    'total_remaining', (
      SELECT COALESCE(SUM(total_amount), 0) - COALESCE(SUM(amount_paid), 0)
      FROM pos_order_splits
      WHERE order_id = p_order_id AND status != 'cancelled'
    ),
    'split_count', (SELECT COUNT(*) FROM pos_order_splits WHERE order_id = p_order_id),
    'paid_count', (SELECT COUNT(*) FROM pos_order_splits WHERE order_id = p_order_id AND status = 'paid')
  )
  FROM pos_order_splits s
  WHERE s.order_id = p_order_id;
$$;
