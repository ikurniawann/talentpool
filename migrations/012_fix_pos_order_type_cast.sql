-- Fix pos_create_order_transaction order_type cast for pos_order_type enum

CREATE OR REPLACE FUNCTION pos_create_order_transaction(
  -- Order metadata
  p_order_type text DEFAULT 'dine_in',
  p_customer_id uuid DEFAULT NULL,
  p_cashier_id uuid DEFAULT NULL,
  p_server_id uuid DEFAULT NULL,
  p_table_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_special_requests text DEFAULT NULL,
  
  -- Financials (from client for reference, but recalculated server-side)
  p_client_subtotal decimal(12,2) DEFAULT 0,
  p_client_discount_amount decimal(12,2) DEFAULT 0,
  p_client_tax_amount decimal(12,2) DEFAULT 0,
  p_client_service_charge decimal(12,2) DEFAULT 0,
  p_client_total_amount decimal(12,2) DEFAULT 0,
  
  -- Payment
  p_payment_method text DEFAULT 'cash',
  p_amount_paid decimal(12,2) DEFAULT 0,
  p_ark_coins_used decimal(12,2) DEFAULT 0,
  
  -- Membership discount
  p_membership_discount_pct decimal(5,2) DEFAULT 0, -- e.g. 15 for 15%
  
  -- Items array (JSONB)
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_number text;
  v_order_id uuid;
  v_item record;
  v_product record;
  v_customer record;
  
  -- Server-side recalculation
  v_server_subtotal decimal(12,2) := 0;
  v_server_discount decimal(12,2) := 0;
  v_server_tax decimal(12,2) := 0;
  v_server_service_charge decimal(12,2) := 0;
  v_server_total decimal(12,2) := 0;
  v_server_change decimal(12,2) := 0;
  v_server_amount_paid decimal(12,2) := 0;
  
  -- XP
  v_xp_earned integer := 0;
  v_xp_total_before integer := 0;
  v_xp_current_before integer := 0;
  v_visit_count_before integer := 0;
  v_total_spent_before decimal(12,2) := 0;
  
  -- Validation
  v_final_price decimal(12,2);
  v_item_subtotal decimal(12,2);
  v_item_total decimal(12,2);
  v_paid_amount_check decimal(12,2);
BEGIN
  -- ===== VALIDATION =====
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  
  -- Validate customer membership if provided
  IF p_customer_id IS NOT NULL THEN
    SELECT id, membership_tier, total_xp, current_xp, visit_count, total_spent, ark_coin_balance
    INTO v_customer
    FROM pos_customers
    WHERE id = p_customer_id;
    
    IF v_customer IS NULL THEN
      RAISE EXCEPTION 'Customer % not found', p_customer_id;
    END IF;
    
    -- Validate ARK coin balance
    IF p_ark_coins_used > 0 AND v_customer.ark_coin_balance < p_ark_coins_used THEN
      RAISE EXCEPTION 'Insufficient Ark Coin balance. Available: %, Requested: %',
        v_customer.ark_coin_balance, p_ark_coins_used;
    END IF;
  END IF;
  
  -- ===== SERVER-SIDE RECALCULATION =====
  -- Iterate items to calculate subtotal
  FOR v_item IN
    SELECT 
      (item->>'product_id')::uuid as product_id,
      (item->>'quantity')::decimal as quantity,
      COALESCE((item->>'unit_price')::decimal, 0) as unit_price,
      COALESCE((item->>'variant_price_adjustment')::decimal, 0) as var_adj,
      COALESCE((item->>'modifier_price_adjustment')::decimal, 0) as mod_adj
    FROM jsonb_array_elements(p_items) as item
  LOOP
    -- Validate product exists and is available
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
    
    -- Validate stock (if inventory tracking enabled and not allowing negative)
    IF v_product.inventory_tracking THEN
      PERFORM pos_validate_stock(v_item.product_id, v_item.quantity);
    END IF;
    
    -- Calculate item price (base + variant + modifier)
    v_final_price := v_item.unit_price + v_item.var_adj + v_item.mod_adj;
    v_item_subtotal := v_final_price * v_item.quantity;
    v_item_total := v_item_subtotal; -- item-level discount not yet implemented
    
    v_server_subtotal := v_server_subtotal + v_item_subtotal;
  END LOOP;
  
  -- Apply membership discount
  IF p_membership_discount_pct > 0 THEN
    v_server_discount := ROUND(v_server_subtotal * p_membership_discount_pct / 100, 2);
  END IF;
  
  -- Apply tax (10% if enabled)
  -- In future: read from product tax_rate or global config
  IF p_client_tax_amount > 0 THEN
    v_server_tax := ROUND((v_server_subtotal - v_server_discount) * 0.10, 2);
  END IF;
  
  -- Service charge
  v_server_service_charge := p_client_service_charge;
  
  -- Total
  v_server_total := v_server_subtotal - v_server_discount + v_server_tax + v_server_service_charge;
  
  -- Validate total matches client (within tolerance)
  IF ABS(v_server_total - p_client_total_amount) > 100 THEN
    RAISE EXCEPTION 'Total amount mismatch. Server: %, Client: %',
      v_server_total, p_client_total_amount;
  END IF;
  
  -- Validate payment amount
  v_paid_amount_check := p_amount_paid + p_ark_coins_used;
  IF v_paid_amount_check < v_server_total THEN
    RAISE EXCEPTION 'Payment insufficient. Total: %, Paid: %',
      v_server_total, v_paid_amount_check;
  END IF;
  
  v_server_change := v_paid_amount_check - v_server_total;
  v_server_amount_paid := p_amount_paid; -- cash/card actual amount (excluding ARK)
  
  -- ===== CREATE ORDER =====
  v_order_number := generate_order_number();
  
  INSERT INTO pos_orders (
    order_number, order_type, status, payment_status,
    customer_id, cashier_id, server_id, table_id,
    subtotal, discount_amount, tax_amount, service_charge_amount,
    total_amount, amount_paid, change_amount,
    payment_method, ark_coins_used,
    notes, special_requests
  ) VALUES (
    v_order_number, p_order_type::pos_order_type, 'pending', 'unpaid',
    p_customer_id, COALESCE(p_cashier_id, '00000000-0000-0000-0000-000000000001'), p_server_id, p_table_id,
    v_server_subtotal, v_server_discount, v_server_tax, v_server_service_charge,
    v_server_total, v_server_amount_paid, v_server_change,
    p_payment_method, p_ark_coins_used,
    p_notes, p_special_requests
  )
  RETURNING id INTO v_order_id;
  
  -- ===== INSERT ORDER ITEMS =====
  INSERT INTO pos_order_items (
    order_id, product_id, product_name, product_sku,
    variants, modifiers, quantity, unit_price,
    subtotal, discount_amount, total_amount, xp_earned
  )
  SELECT
    v_order_id,
    (item->>'product_id')::uuid,
    COALESCE(item->>'product_name', 'Unknown'),
    LEFT(COALESCE(item->>'product_sku', ''), 50),
    COALESCE(item->'variants', '[]'::jsonb),
    COALESCE(item->'modifiers', '[]'::jsonb),
    (item->>'quantity')::decimal,
    ((item->>'unit_price')::decimal + COALESCE((item->>'variant_price_adjustment')::decimal, 0) + COALESCE((item->>'modifier_price_adjustment')::decimal, 0)),
    (((item->>'unit_price')::decimal + COALESCE((item->>'variant_price_adjustment')::decimal, 0) + COALESCE((item->>'modifier_price_adjustment')::decimal, 0)) * (item->>'quantity')::decimal),
    0,
    (((item->>'unit_price')::decimal + COALESCE((item->>'variant_price_adjustment')::decimal, 0) + COALESCE((item->>'modifier_price_adjustment')::decimal, 0)) * (item->>'quantity')::decimal), -- total = subtotal (no item discount)
    0  -- xp per item calculated later
  FROM jsonb_array_elements(p_items) as item;
  
  -- ===== DEDUCT INVENTORY =====
  FOR v_item IN
    SELECT 
      (item->>'product_id')::uuid as product_id,
      (item->>'quantity')::decimal as quantity
    FROM jsonb_array_elements(p_items) as item
  LOOP
    -- Check if product tracks inventory
    SELECT inventory_tracking INTO v_product
    FROM pos_products WHERE id = v_item.product_id;
    
    IF v_product.inventory_tracking THEN
      PERFORM pos_deduct_inventory(v_item.product_id, v_item.quantity, v_order_id);
    END IF;
    
    -- Mark item as deducted
    UPDATE pos_order_items
    SET inventory_deducted = true
    WHERE order_id = v_order_id AND product_id = v_item.product_id;
  END LOOP;
  
  -- ===== AUDIT TRAIL =====
  INSERT INTO pos_order_status_history (
    order_id, from_status, to_status, changed_by, notes
  ) VALUES (
    v_order_id, NULL, 'pending',
    COALESCE(p_cashier_id, '00000000-0000-0000-0000-000000000001'),
    'Order created'
  );
  
  -- ===== UPDATE CUSTOMER (XP + Visit) =====
  IF p_customer_id IS NOT NULL THEN
    -- Calculate XP
    v_xp_earned := pos_calculate_xp_earned(v_server_total, v_customer.membership_tier);
    
    -- Store pre-values
    v_xp_total_before := v_customer.total_xp;
    v_xp_current_before := v_customer.current_xp;
    v_visit_count_before := v_customer.visit_count;
    v_total_spent_before := v_customer.total_spent;
    
    -- Update customer (INCREMENT, not overwrite!)
    UPDATE pos_customers SET
      total_xp = total_xp + v_xp_earned,
      current_xp = current_xp + v_xp_earned,
      visit_count = visit_count + 1,
      total_spent = total_spent + v_server_total,
      last_visit = now(),
      updated_at = now()
    WHERE id = p_customer_id;
    
    -- Log XP transaction
    INSERT INTO pos_xp_transactions (
      customer_id, order_id, xp_earned, 
      balance_before, balance_after, description
    ) VALUES (
      p_customer_id, v_order_id, v_xp_earned,
      v_xp_current_before, v_xp_current_before + v_xp_earned,
      'XP dari order ' || v_order_number
    );
    
    -- Deduct ARK coins if used
    IF p_ark_coins_used > 0 THEN
      PERFORM update_ark_coin_balance(
        p_customer_id, 
        -p_ark_coins_used, 
        'payment', 
        v_order_id,
        'Payment for order ' || v_order_number
      );
    END IF;
  END IF;
  
  -- ===== RETURN COMPLETE ORDER =====
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_server_subtotal,
    'discount_amount', v_server_discount,
    'tax_amount', v_server_tax,
    'total_amount', v_server_total,
    'change_amount', v_server_change,
    'ark_coins_used', p_ark_coins_used,
    'xp_earned', v_xp_earned,
    'items_count', jsonb_array_length(p_items)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Transaction automatically rolls back on exception
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE
    );
END;
$$;


GRANT EXECUTE ON FUNCTION pos_create_order_transaction(
  text, uuid, uuid, uuid, uuid, text, text,
  decimal, decimal, decimal, decimal, decimal,
  text, decimal, decimal, decimal, jsonb
) TO authenticated;
GRANT EXECUTE ON FUNCTION pos_create_order_transaction(
  text, uuid, uuid, uuid, uuid, text, text,
  decimal, decimal, decimal, decimal, decimal,
  text, decimal, decimal, decimal, jsonb
) TO service_role;
