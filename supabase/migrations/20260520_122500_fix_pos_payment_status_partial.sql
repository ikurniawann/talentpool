-- Fix live database objects that still reference invalid enum value 'partially_paid'.
-- Canonical pos_payment_status enum value is 'partial'.

CREATE OR REPLACE FUNCTION pos_update_shift_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_shift_id UUID;
  v_total_orders INTEGER;
  v_total_sales NUMERIC(12,2);
  v_total_cash NUMERIC(12,2);
  v_total_qris NUMERIC(12,2);
  v_total_debit NUMERIC(12,2);
  v_total_credit NUMERIC(12,2);
  v_total_ark NUMERIC(12,2);
  v_expected NUMERIC(12,2);
BEGIN
  v_shift_id := NEW.shift_id;

  IF v_shift_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('completed','served') AND NEW.payment_status NOT IN ('paid','partial') THEN
    RETURN NEW;
  END IF;

  SELECT
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount_paid ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'debit' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(ark_coins_used), 0)
  INTO
    v_total_orders, v_total_sales,
    v_total_cash, v_total_qris,
    v_total_debit, v_total_credit, v_total_ark
  FROM pos_orders
  WHERE shift_id = v_shift_id;

  SELECT COALESCE(opening_cash, 0) + v_total_cash
  INTO v_expected
  FROM pos_shifts
  WHERE id = v_shift_id;

  UPDATE pos_shifts SET
    total_orders = v_total_orders,
    total_sales = v_total_sales,
    total_cash_sales = v_total_cash,
    total_qris_sales = v_total_qris,
    total_debit_sales = v_total_debit,
    total_credit_sales = v_total_credit,
    total_ark_coin_sales = v_total_ark,
    expected_cash = v_expected,
    updated_at = NOW()
  WHERE id = v_shift_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Also normalize the split payment RPC if it exists.
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
    RETURN jsonb_build_object('success', false, 'error', format('Amount paid %.0f is less than split total %.0f', p_amount_paid, v_split_record.total_amount));
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
  END IF;

  INSERT INTO pos_split_payments (split_id, order_id, amount, change_amount, payment_method, reference_number, cashier_id)
  VALUES (p_split_id, v_order_id, p_amount_paid, v_change, p_payment_method, p_reference_number, p_cashier_id);

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
    SET payment_status = 'paid', completed_at = now()
    WHERE id = v_order_id;
  ELSIF v_all_paid_count >= 1 THEN
    UPDATE pos_orders
    SET payment_status = 'partial'
    WHERE id = v_order_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'split_id', p_split_id, 'change', v_change, 'paid_splits', v_all_paid_count, 'total_splits', v_total_splits);
END;
$$;
