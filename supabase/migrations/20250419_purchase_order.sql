-- ============================================================
-- Purchasing Module Migration - Phase 3: Purchase Order
-- ============================================================

-- ============================================================
-- 1. PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL,
  pr_id UUID REFERENCES purchase_requests(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'received', 'closed', 'cancelled')),
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 11,  -- PPN 11%
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_cost DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  order_date DATE NOT NULL,
  delivery_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  payment_terms TEXT,
  delivery_address TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  sent_by UUID
);

-- ============================================================
-- 2. PO ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS po_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  pr_item_id UUID REFERENCES pr_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit TEXT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  received_qty INTEGER DEFAULT 0,
  notes TEXT
);

-- ============================================================
-- 3. GOODS RECEIPTS (GR)
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_number TEXT UNIQUE NOT NULL,
  po_id UUID REFERENCES purchase_orders(id) NOT NULL,
  received_date DATE NOT NULL,
  received_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. GOODS RECEIPT ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS gr_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_id UUID REFERENCES goods_receipts(id) ON DELETE CASCADE NOT NULL,
  po_item_id UUID REFERENCES po_items(id) NOT NULL,
  received_qty INTEGER NOT NULL CHECK (received_qty > 0),
  condition TEXT CHECK (condition IN ('good', 'damaged', 'incomplete')),
  notes TEXT
);

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gr_items ENABLE ROW LEVEL SECURITY;

-- Purchase Orders: Purchasing staff can view all
DROP POLICY IF EXISTS "Purchasing users can view all POs" ON purchase_orders;
CREATE POLICY "Purchasing users can view all POs"
  ON purchase_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() 
      AND role IN ('purchasing_staff', 'purchasing_manager', 'direksi', 'finance_staff', 'warehouse_staff')
    )
  );

-- Purchase Orders: Only purchasing can create
DROP POLICY IF EXISTS "Purchasing users can create POs" ON purchase_orders;
CREATE POLICY "Purchasing users can create POs"
  ON purchase_orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() 
      AND role IN ('purchasing_staff', 'purchasing_manager')
    )
  );

-- Purchase Orders: Only creator or manager can update
DROP POLICY IF EXISTS "Purchasing users can update POs" ON purchase_orders;
CREATE POLICY "Purchasing users can update POs"
  ON purchase_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() 
      AND role IN ('purchasing_staff', 'purchasing_manager', 'direksi')
    )
  );

-- PO Items: Cascade with PO permissions
DROP POLICY IF EXISTS "PO items viewable with PO access" ON po_items;
CREATE POLICY "PO items viewable with PO access"
  ON po_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po 
      WHERE po.id = po_items.po_id 
      AND EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() 
        AND role IN ('purchasing_staff', 'purchasing_manager', 'direksi', 'finance_staff', 'warehouse_staff')
      )
    )
  );

-- Goods Receipts: Warehouse can view and create
DROP POLICY IF EXISTS "Warehouse users can manage GRs" ON goods_receipts;
CREATE POLICY "Warehouse users can manage GRs"
  ON goods_receipts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() 
      AND role IN ('warehouse_staff', 'purchasing_manager', 'direksi')
    )
  );

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_pr ON purchase_orders(pr_id);
CREATE INDEX IF NOT EXISTS idx_po_created ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_gr_po_id ON goods_receipts(po_id);

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. HELPER FUNCTION: Generate PO Number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    last_num INTEGER;
    new_num INTEGER;
BEGIN
    year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(po_number, '-', 3) AS INTEGER)),
        0
    )
    INTO last_num
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || year || '-%';
    
    new_num := last_num + 1;
    
    RETURN 'PO-' || year || '-' || LPAD(new_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. HELPER FUNCTION: Generate GR Number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_gr_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    last_num INTEGER;
    new_num INTEGER;
BEGIN
    year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(gr_number, '-', 3) AS INTEGER)),
        0
    )
    INTO last_num
    FROM goods_receipts
    WHERE gr_number LIKE 'GR-' || year || '-%';
    
    new_num := last_num + 1;
    
    RETURN 'GR-' || year || '-' || LPAD(new_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Migration Complete
-- ============================================================
