-- ============================================================
-- POS Payment Status Enum Compatibility Fix
-- ============================================================
-- The canonical enum value in pos_payment_status is 'partial', not 'partially_paid'.
-- This migration replaces older split-payment logic that wrote 'partially_paid'.

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
  v_customer_id UUID;
  v_cust_balance NUMERIC(12,2);
  v_change NUMERIC(12,2);
  v_all_paid_count INTEGER;
  v_total_splits INTEGER;
BEGIN
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

  IF p_amount_paid < v_split_record.total_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Amount paid %.0f is less than split total %.0f', p_amount_paid, v_split_record.total_amount)
    );
  END IF;

  v_change := p_amount_paid - v_split_record.total_amount;
  v_customer_id := v_split_record.customer_id;

  IF p_ark_coins_used > 0 THEN
    IF v_customer_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cannot use ARK Coin without member customer');
    END IF;

    PERFORM id FROM pos_customers WHERE id = v_customer_id FOR UPDATE;

    SELECT ark_coin_balance INTO v_cust_balance FROM pos_customers WHERE id = v_customer_id;
    IF v_cust_balance < p_ark_coins_used THEN
      RETURN jsonb_build_object('success', false, 'error', format('ARK Coin balance insufficient: %.0f needed, %.0f available', p_ark_coins_used, v_cust_balance));
    END IF;

    UPDATE pos_customers
    SET ark_coin_balance = ark_coin_balance - p_ark_coins_used
    WHERE id = v_customer_id;

    INSERT INTO pos_xp_transactions (customer_id, xp_amount, type, description, related_order_id)
    VALUES (v_customer_id, 0, 'ark_used', 'ARK Coin used for split payment: ' || v_split_record.label, v_order_id);
  END IF;

  INSERT INTO pos_split_payments (
    split_id, order_id, amount, change_amount, payment_method, reference_number, cashier_id
  ) VALUES (
    p_split_id, v_order_id, p_amount_paid, v_change, p_payment_method, p_reference_number, p_cashier_id
  );

  UPDATE pos_order_splits
  SET status = 'paid',
      payment_method = p_payment_method,
      amount_paid = p_amount_paid,
      change_amount = v_change,
      ark_coins_used = p_ark_coins_used,
      paid_at = now()
  WHERE id = p_split_id;

  SELECT COUNT(*) INTO v_total_splits FROM pos_order_splits WHERE order_id = v_order_id;
  SELECT COUNT(*) INTO v_all_paid_count FROM pos_order_splits WHERE order_id = v_order_id AND status = 'paid';

  IF v_all_paid_count = v_total_splits THEN
    UPDATE pos_orders
    SET payment_status = 'paid',
        completed_at = now()
    WHERE id = v_order_id;
  ELSIF v_all_paid_count >= 1 THEN
    UPDATE pos_orders
    SET payment_status = 'partial'
    WHERE id = v_order_id;
  END IF;

  INSERT INTO pos_order_status_history (order_id, from_status, to_status, reason, changed_at)
  SELECT v_order_id, status, status, format('Split %s paid via %s', v_split_record.label, p_payment_method), now()
  FROM pos_orders
  WHERE id = v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'split_id', p_split_id,
    'change', v_change,
    'paid_splits', v_all_paid_count,
    'total_splits', v_total_splits
  );
END;
$$;

-- Normalize any existing invalid textual value if the column was ever changed away from enum.
UPDATE pos_orders
SET payment_status = 'partial'
WHERE payment_status::text = 'partially_paid';
