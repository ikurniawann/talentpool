-- Migration: 008_pos_shift_management
-- Shift management: open/close cashier shifts with cash tracking

-- 1. Shift table
CREATE TABLE IF NOT EXISTS pos_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_number VARCHAR(20) UNIQUE NOT NULL,
  cashier_id UUID NOT NULL,
  branch_id UUID,
  
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opened_by TEXT,
  closed_by TEXT,
  
  opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(12,2) DEFAULT 0,
  expected_cash NUMERIC(12,2) DEFAULT 0,
  variance NUMERIC(12,2) GENERATED ALWAYS AS (closing_cash - expected_cash) STORED,
  
  total_orders INTEGER DEFAULT 0,
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_refunds NUMERIC(12,2) DEFAULT 0,
  total_cash_sales NUMERIC(12,2) DEFAULT 0,
  total_qris_sales NUMERIC(12,2) DEFAULT 0,
  total_debit_sales NUMERIC(12,2) DEFAULT 0,
  total_credit_sales NUMERIC(12,2) DEFAULT 0,
  total_ark_coin_sales NUMERIC(12,2) DEFAULT 0,
  
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','closed','cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add shift_id to pos_orders
ALTER TABLE pos_orders ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES pos_shifts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pos_orders_shift_id ON pos_orders(shift_id);

-- 3. Trigger auto-update pos_shifts totals after order status changes to completed/paid
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
  
  -- Only update on status change to completed, served, or paid payment_status
  IF NEW.status NOT IN ('completed','served') AND NEW.payment_status NOT IN ('paid','partial') THEN
    RETURN NEW;
  END IF;
  
  -- Recalculate totals for this shift
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
  
  -- Expected cash = opening + cash sales - refunds (simplified)
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

-- Use AFTER UPDATE to capture the change
DROP TRIGGER IF EXISTS pos_order_shift_totals_trigger ON pos_orders;
CREATE TRIGGER pos_order_shift_totals_trigger
  AFTER UPDATE ON pos_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION pos_update_shift_totals();

-- 4. RLS (if RLS enabled on pos_shifts)
ALTER TABLE pos_shifts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_shifts' AND policyname = 'pos_shifts_select_all'
  ) THEN
    CREATE POLICY pos_shifts_select_all ON pos_shifts FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_shifts' AND policyname = 'pos_shifts_insert_all'
  ) THEN
    CREATE POLICY pos_shifts_insert_all ON pos_shifts FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_shifts' AND policyname = 'pos_shifts_update_all'
  ) THEN
    CREATE POLICY pos_shifts_update_all ON pos_shifts FOR UPDATE USING (true);
  END IF;
END;
$$;

-- 5. Generate shift number
CREATE OR REPLACE FUNCTION generate_shift_number()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT := to_char(NOW(), 'YYYYMMDD');
  v_count INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(shift_number FROM 13 FOR 4) AS INTEGER)), 0)
  INTO v_count
  FROM pos_shifts
  WHERE shift_number LIKE 'SHF-' || v_date || '-%';
  
  RETURN 'SHF-' || v_date || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
