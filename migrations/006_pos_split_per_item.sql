-- Migration: 006_pos_split_per_item
-- Extends pos_create_split_order_transaction to support per-item split assignment

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

  -- Insert order items and collect IDs
  v_item_ids := ARRAY[]::UUID[];
  
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
    
    v_item_ids := array_append(v_item_ids, v_item_id);
    v_item_index := v_item_index + 1;
  END LOOP;

  -- Insert splits and collect IDs
  v_split_index := 0;
  
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

    -- Insert pos_order_split_items if items mapping exists
    IF jsonb_typeof(v_split->'items') = 'array' THEN
      FOR v_mapping IN SELECT * FROM jsonb_array_elements(v_split->'items')
      LOOP
        DECLARE
          v_map_idx INTEGER;
          v_map_qty INTEGER;
        BEGIN
          v_map_idx := COALESCE((v_mapping->>'order_item_index')::INTEGER, -1);
          v_map_qty := COALESCE((v_mapping->>'quantity')::INTEGER, 1);
          
          IF v_map_idx >= 0 AND v_map_idx < array_length(v_item_ids, 1) THEN
            INSERT INTO pos_order_split_items (
              split_id,
              order_item_id,
              quantity,
              subtotal,
              total_amount
            ) VALUES (
              v_split_id,
              v_item_ids[v_map_idx + 1],
              v_map_qty,
              COALESCE((v_mapping->>'unit_price')::NUMERIC, 0) * v_map_qty,
              COALESCE((v_mapping->>'unit_price')::NUMERIC, 0) * v_map_qty
            );
          END IF;
        END;
      END LOOP;
    END IF;
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
