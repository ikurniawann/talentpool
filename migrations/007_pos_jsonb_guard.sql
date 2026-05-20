-- Migration: 007_pos_jsonb_guard
-- Fix: guard jsonb_array_length against scalar inputs
-- NOTE: pos_create_order_transaction sudah ada di 004. Kita hanya patch
--       pos_create_split_order_transaction (yang di-override di 006).

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
  v_item_ids UUID[];
  v_item_index INTEGER := 0;
  v_split JSONB;
  v_split_id UUID;
  v_split_index INTEGER := 0;
  v_sum_splits NUMERIC(12,2) := 0;
  v_mapping JSONB;
BEGIN
  IF p_splits IS NULL OR jsonb_typeof(p_splits) != 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'p_splits must be a JSON array',
      'got', COALESCE(p_splits::TEXT, 'NULL')
    );
  END IF;

  IF jsonb_array_length(p_splits) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'splits array cannot be empty for split bill'
    );
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'p_items must be a JSON array',
      'got', COALESCE(p_items::TEXT, 'NULL')
    );
  END IF;

  SELECT COALESCE(SUM((value ->> 'total_amount')::NUMERIC), 0)
  INTO v_sum_splits
  FROM jsonb_array_elements(p_splits);

  IF v_sum_splits != p_total_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Splits total (%.2f) does not match order total (%.2f)', v_sum_splits, p_total_amount)
    );
  END IF;

  v_order_number := generate_order_number();

  INSERT INTO pos_orders (
    order_number, order_type, status, payment_status,
    customer_id, cashier_id, server_id,
    subtotal, discount_amount, discount_reason,
    tax_amount, service_charge_amount, total_amount,
    amount_paid, change_amount, notes, special_requests,
    ordered_at
  ) VALUES (
    v_order_number, p_order_type::pos_order_type, 'pending', 'unpaid',
    p_customer_id, p_cashier_id, p_server_id,
    p_subtotal, p_discount_amount, p_discount_reason,
    p_tax_amount, p_service_charge_amount, p_total_amount,
    0, 0, p_notes, p_special_requests, now()
  ) RETURNING id INTO v_order_id;

  v_item_ids := ARRAY[]::UUID[];

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO pos_order_items (
      order_id, product_id, product_name, product_sku,
      variant_info, modifier_info, quantity,
      unit_price, subtotal, total_amount, notes
    ) VALUES (
      v_order_id,
      (v_item ->> 'product_id')::UUID,
      v_item ->> 'product_name',
      v_item ->> 'product_sku',
      v_item ->> 'variant_info',
      v_item ->> 'modifier_info',
      (v_item ->> 'quantity')::INTEGER,
      (v_item ->> 'unit_price')::NUMERIC,
      (v_item ->> 'subtotal')::NUMERIC,
      (v_item ->> 'total_amount')::NUMERIC,
      v_item ->> 'notes'
    ) RETURNING id INTO v_item_id;

    v_item_ids := array_append(v_item_ids, v_item_id);
    v_item_index := v_item_index + 1;
  END LOOP;

  v_split_index := 0;

  FOR v_split IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    v_split_index := v_split_index + 1;
    INSERT INTO pos_order_splits (
      order_id, split_index, label,
      subtotal, tax_amount, discount_amount,
      total_amount, customer_id, status
    ) VALUES (
      v_order_id, v_split_index,
      COALESCE(v_split ->> 'label', 'Split ' || v_split_index),
      COALESCE((v_split ->> 'subtotal')::NUMERIC, 0),
      COALESCE((v_split ->> 'tax_amount')::NUMERIC, 0),
      COALESCE((v_split ->> 'discount_amount')::NUMERIC, 0),
      (v_split ->> 'total_amount')::NUMERIC,
      (v_split ->> 'customer_id')::UUID,
      'pending'
    ) RETURNING id INTO v_split_id;

    IF jsonb_typeof(v_split -> 'items') = 'array' THEN
      FOR v_mapping IN SELECT * FROM jsonb_array_elements(v_split -> 'items')
      LOOP
        DECLARE
          v_map_idx INTEGER;
          v_map_qty INTEGER;
        BEGIN
          v_map_idx := COALESCE((v_mapping ->> 'order_item_index')::INTEGER, -1);
          v_map_qty := COALESCE((v_mapping ->> 'quantity')::INTEGER, 1);

          IF v_map_idx >= 0 AND v_map_idx < COALESCE(array_length(v_item_ids, 1), 0) THEN
            INSERT INTO pos_order_split_items (
              split_id, order_item_id, quantity,
              subtotal, total_amount
            ) VALUES (
              v_split_id,
              v_item_ids[v_map_idx + 1],
              v_map_qty,
              COALESCE((v_mapping ->> 'unit_price')::NUMERIC, 0) * v_map_qty,
              COALESCE((v_mapping ->> 'unit_price')::NUMERIC, 0) * v_map_qty
            );
          END IF;
        END;
      END LOOP;
    END IF;
  END LOOP;

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

-- pos_create_order_transaction guard (single-payment)
CREATE OR REPLACE FUNCTION pos_create_order_transaction(
  p_order_type text DEFAULT 'dine_in',
  p_customer_id uuid DEFAULT NULL,
  p_cashier_id uuid DEFAULT NULL,
  p_server_id uuid DEFAULT NULL,
  p_table_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_special_requests text DEFAULT NULL,
  p_client_subtotal decimal(12,2) DEFAULT 0,
  p_client_discount_amount decimal(12,2) DEFAULT 0,
  p_client_tax_amount decimal(12,2) DEFAULT 0,
  p_client_service_charge decimal(12,2) DEFAULT 0,
  p_client_total_amount decimal(12,2) DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_amount_paid decimal(12,2) DEFAULT 0,
  p_ark_coins_used decimal(12,2) DEFAULT 0,
  p_membership_discount_pct decimal(5,2) DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
  v_customer record;
  v_item record;
  v_product record;

  v_server_subtotal decimal(12,2) := 0;
  v_server_discount decimal(12,2) := 0;
  v_server_tax decimal(12,2) := 0;
  v_server_service_charge decimal(12,2) := 0;
  v_server_total decimal(12,2) := 0;
  v_server_change decimal(12,2) := 0;
  v_server_amount_paid decimal(12,2) := 0;

  v_xp_earned integer := 0;
  v_xp_current_before integer := 0;
  v_final_price decimal(12,2);
  v_item_subtotal decimal(12,2);
  v_paid_amount_check decimal(12,2);
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'p_items must be a JSON array');
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  IF p_customer_id IS NOT NULL THEN
    SELECT id, membership_tier, total_xp, current_xp, visit_count, total_spent, ark_coin_balance
    INTO v_customer
    FROM pos_customers
    WHERE id = p_customer_id;

    IF v_customer IS NULL THEN
      RAISE EXCEPTION 'Customer % not found', p_customer_id;
    END IF;

    IF p_ark_coins_used > 0 AND v_customer.ark_coin_balance < p_ark_coins_used THEN
      RAISE EXCEPTION 'Insufficient Ark Coin balance. Available: %, Requested: %',
        v_customer.ark_coin_balance, p_ark_coins_used;
    END IF;
  END IF;

  FOR v_item IN
    SELECT
      (item ->> 'product_id')::uuid as product_id,
      (item ->> 'quantity')::decimal as quantity,
      COALESCE((item ->> 'unit_price')::decimal, 0) as unit_price,
      COALESCE((item ->> 'variant_price_adjustment')::decimal, 0) as var_adj,
      COALESCE((item ->> 'modifier_price_adjustment')::decimal, 0) as mod_adj
    FROM jsonb_array_elements(p_items) as item
  LOOP
    SELECT id, is_active, is_available, inventory_tracking
    INTO v_product
    FROM pos_products
    WHERE id = v_item.product_id;

    IF v_product IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_item.product_id;
    END IF;

    IF NOT v_product.is_active OR NOT v_product.is_available THEN
      RAISE EXCEPTION 'Product % is not available', v_item.product_id;
    END IF;

    IF v_product.inventory_tracking THEN
      PERFORM pos_validate_stock(v_item.product_id, v_item.quantity);
    END IF;

    v_final_price := v_item.unit_price + v_item.var_adj + v_item.mod_adj;
    v_item_subtotal := v_final_price * v_item.quantity;
    v_server_subtotal := v_server_subtotal + v_item_subtotal;
  END LOOP;

  IF p_membership_discount_pct > 0 THEN
    v_server_discount := ROUND(v_server_subtotal * p_membership_discount_pct / 100, 2);
  END IF;

  IF p_client_tax_amount > 0 THEN
    v_server_tax := ROUND((v_server_subtotal - v_server_discount) * 0.10, 2);
  END IF;

  v_server_service_charge := p_client_service_charge;
  v_server_total := v_server_subtotal - v_server_discount + v_server_tax + v_server_service_charge;

  IF ABS(v_server_total - p_client_total_amount) > 100 THEN
    RAISE EXCEPTION 'Total amount mismatch. Server: %, Client: %', v_server_total, p_client_total_amount;
  END IF;

  v_paid_amount_check := p_amount_paid + p_ark_coins_used;
  IF v_paid_amount_check < v_server_total THEN
    RAISE EXCEPTION 'Payment insufficient. Total: %, Paid: %', v_server_total, v_paid_amount_check;
  END IF;

  v_server_change := v_paid_amount_check - v_server_total;
  v_server_amount_paid := p_amount_paid;

  INSERT INTO pos_orders (
    order_number, order_type, status, payment_status,
    customer_id, cashier_id, server_id,
    subtotal, discount_amount, tax_amount, service_charge_amount,
    total_amount, amount_paid, change_amount,
    payment_method, ark_coins_used,
    notes, special_requests
  ) VALUES (
    generate_order_number(), p_order_type::pos_order_type, 'pending', 'unpaid',
    p_customer_id, COALESCE(p_cashier_id, '00000000-0000-0000-0000-000000000001'::uuid), p_server_id,
    v_server_subtotal, v_server_discount, v_server_tax, v_server_service_charge,
    v_server_total, v_server_amount_paid, v_server_change,
    p_payment_method, p_ark_coins_used,
    p_notes, p_special_requests
  )
  RETURNING id INTO v_order_id;

  INSERT INTO pos_order_items (
    order_id, product_id, product_name, product_sku,
    variants, modifiers, quantity, unit_price,
    subtotal, discount_amount, total_amount, xp_earned
  )
  SELECT
    v_order_id,
    (item ->> 'product_id')::uuid,
    COALESCE(item ->> 'product_name', 'Unknown'),
    COALESCE(item ->> 'product_sku', ''),
    COALESCE(item -> 'variants', '[]'::jsonb),
    COALESCE(item -> 'modifiers', '[]'::jsonb),
    (item ->> 'quantity')::decimal,
    ((item ->> 'unit_price')::decimal
      + COALESCE((item ->> 'variant_price_adjustment')::decimal, 0)
      + COALESCE((item ->> 'modifier_price_adjustment')::decimal, 0)),
    (((item ->> 'unit_price')::decimal
      + COALESCE((item ->> 'variant_price_adjustment')::decimal, 0)
      + COALESCE((item ->> 'modifier_price_adjustment')::decimal, 0))
      * (item ->> 'quantity')::decimal),
    0,
    (((item ->> 'unit_price')::decimal
      + COALESCE((item ->> 'variant_price_adjustment')::decimal, 0)
      + COALESCE((item ->> 'modifier_price_adjustment')::decimal, 0))
      * (item ->> 'quantity')::decimal),
    0
  FROM jsonb_array_elements(p_items) as item;

  FOR v_item IN
    SELECT
      (item ->> 'product_id')::uuid as product_id,
      (item ->> 'quantity')::decimal as quantity
    FROM jsonb_array_elements(p_items) as item
  LOOP
    SELECT inventory_tracking INTO v_product
    FROM pos_products WHERE id = v_item.product_id;

    IF v_product.inventory_tracking THEN
      PERFORM pos_deduct_inventory(v_item.product_id, v_item.quantity, v_order_id);
    END IF;

    UPDATE pos_order_items
    SET inventory_deducted = true
    WHERE order_id = v_order_id AND product_id = v_item.product_id;
  END LOOP;

  INSERT INTO pos_order_status_history (
    order_id, from_status, to_status, changed_by, notes
  ) VALUES (
    v_order_id, NULL, 'pending',
    COALESCE(p_cashier_id, '00000000-0000-0000-0000-000000000001'::uuid),
    'Order created'
  );

  IF p_customer_id IS NOT NULL THEN
    v_xp_earned := pos_calculate_xp_earned(v_server_total, v_customer.membership_tier);
    v_xp_current_before := v_customer.current_xp;

    UPDATE pos_customers SET
      total_xp = total_xp + v_xp_earned,
      current_xp = current_xp + v_xp_earned,
      visit_count = visit_count + 1,
      total_spent = total_spent + v_server_total,
      last_visit = now(),
      updated_at = now()
    WHERE id = p_customer_id;

    INSERT INTO pos_xp_transactions (
      customer_id, order_id, xp_earned,
      balance_before, balance_after, description
    ) VALUES (
      p_customer_id, v_order_id, v_xp_earned,
      v_xp_current_before, v_xp_current_before + v_xp_earned,
      'XP dari order ' || v_order_id 
    );

    IF p_ark_coins_used > 0 THEN
      PERFORM update_ark_coin_balance(
        p_customer_id, -p_ark_coins_used, 'payment', v_order_id,
        'Payment for order ' || v_order_id
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', (
      SELECT order_number FROM pos_orders WHERE id = v_order_id
    ),
    'subtotal', v_server_subtotal,
    'discount_amount', v_server_discount,
    'tax_amount', v_server_tax,
    'total_amount', v_server_total,
    'change_amount', v_server_change,
    'ark_coins_used', p_ark_coins_used,
    'xp_earned', v_xp_earned,
    'total_paid', v_server_amount_paid + p_ark_coins_used,
    'payment_status', 'unpaid'
  );
END;
$$;
