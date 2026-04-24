-- ============================================
-- PURCHASE RETURNS MODULE
-- ============================================
-- Migration: Create purchase return tables
-- Date: 2026-04-25
-- ============================================

-- Table: purchase_returns
CREATE TABLE IF NOT EXISTS purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(50) UNIQUE NOT NULL,
  grn_id UUID REFERENCES grn(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason_type VARCHAR(50) NOT NULL CHECK (reason_type IN (
    'damaged', 
    'wrong_item', 
    'expired', 
    'overstock', 
    'specification_mismatch',
    'other'
  )),
  reason_notes TEXT,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft', 
    'pending_approval', 
    'approved', 
    'rejected', 
    'completed',
    'cancelled'
  )),
  approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  total_amount DECIMAL(12,2) DEFAULT 0,
  shipping_date DATE,
  tracking_number VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for purchase_returns
CREATE INDEX IF NOT EXISTS idx_purchase_returns_grn ON purchase_returns(grn_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_supplier ON purchase_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_status ON purchase_returns(status);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_return_date ON purchase_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_created_by ON purchase_returns(created_by);

-- Table: purchase_return_items
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES purchase_returns(id) ON DELETE CASCADE,
  grn_item_id UUID REFERENCES grn_items(id) ON DELETE SET NULL,
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE RESTRICT,
  qty_returned DECIMAL(10,3) NOT NULL CHECK (qty_returned > 0),
  unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0),
  subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
  batch_number VARCHAR(100),
  expiry_date DATE,
  condition_notes TEXT,
  qc_status VARCHAR(50) DEFAULT 'rejected' CHECK (qc_status IN ('rejected', 'partially_rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for purchase_return_items
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_return_id ON purchase_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_raw_material ON purchase_return_items(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_purchase_return_items_grn_item ON purchase_return_items(grn_item_id);

-- Add return tracking to GRN items
ALTER TABLE grn_items 
ADD COLUMN IF NOT EXISTS qty_returned DECIMAL(10,3) DEFAULT 0 CHECK (qty_returned >= 0);

-- Add batch tracking columns if not exist
ALTER TABLE grn_items
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add return-related columns to inventory_movements
ALTER TABLE inventory_movements
ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES purchase_returns(id) ON DELETE SET NULL;

-- Create view for returnable items (items that can be returned)
CREATE OR REPLACE VIEW v_returnable_items AS
SELECT 
  gi.id AS grn_item_id,
  gi.grn_id,
  gi.raw_material_id,
  rm.kode AS raw_material_kode,
  rm.nama AS raw_material_nama,
  gi.qty_diterima,
  gi.qty_returned,
  (gi.qty_diterima - gi.qty_returned) AS qty_available_to_return,
  COALESCE(poi.harga_satuan, poi.unit_price, 0) AS unit_price,
  gi.batch_number,
  gi.expiry_date,
  gi.qc_status,
  g.supplier_id,
  s.nama_supplier,
  u.nama AS satuan
FROM grn_items gi
JOIN grn g ON g.id = gi.grn_id
JOIN raw_materials rm ON rm.id = gi.raw_material_id
JOIN suppliers s ON s.id = g.supplier_id
LEFT JOIN purchase_order_items poi ON poi.id = gi.purchase_order_item_id
LEFT JOIN units u ON u.id = gi.satuan_id
WHERE g.status IN ('received', 'partially_received')
  AND gi.qty_diterima > COALESCE(gi.qty_returned, 0)
  AND gi.qc_status IN ('rejected', 'partially_rejected');

-- Function to auto-generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  return_num TEXT;
BEGIN
  year_part := EXTRACT(YEAR FROM NEW.return_date)::TEXT;
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(return_number FROM 'RET-' || year_part || '-(\d+)$' AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM purchase_returns
  WHERE return_number LIKE 'RET-' || year_part || '-%';
  
  -- Format: RET-2026-001
  return_num := 'RET-' || year_part || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  NEW.return_number := return_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate return number on insert
DROP TRIGGER IF EXISTS trg_generate_return_number ON purchase_returns;
CREATE TRIGGER trg_generate_return_number
  BEFORE INSERT ON purchase_returns
  FOR EACH ROW
  WHEN (NEW.return_number IS NULL)
  EXECUTE FUNCTION generate_return_number();

-- Function to update GRN and Inventory on return approval
CREATE OR REPLACE FUNCTION process_return_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update GRN items qty_returned
    UPDATE grn_items gi
    SET qty_returned = qty_returned + pri.qty_returned
    FROM purchase_return_items pri
    WHERE pri.return_id = NEW.id
      AND gi.id = pri.grn_item_id;
    
    -- Create inventory OUT movements
    INSERT INTO inventory_movements (
      raw_material_id,
      movement_type,
      qty,
      reference_id,
      reference_type,
      notes,
      created_by
    )
    SELECT 
      pri.raw_material_id,
      'RETURN_OUT',
      -pri.qty_returned, -- Negative = stock out
      NEW.id,
      'purchase_return',
      'Return to supplier: ' || NEW.return_number || ' - ' || COALESCE(pri.condition_notes, ''),
      NEW.approved_by
    FROM purchase_return_items pri
    WHERE pri.return_id = NEW.id;
    
    -- Update raw_materials stock
    UPDATE raw_materials rm
    SET qty_onhand = qty_onhand - (
      SELECT COALESCE(SUM(pri.qty_returned), 0)
      FROM purchase_return_items pri
      WHERE pri.return_id = NEW.id AND pri.raw_material_id = rm.id
    )
    WHERE EXISTS (
      SELECT 1 FROM purchase_return_items pri
      WHERE pri.return_id = NEW.id AND pri.raw_material_id = rm.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to process return on approval
DROP TRIGGER IF EXISTS trg_process_return_approval ON purchase_returns;
CREATE TRIGGER trg_process_return_approval
  AFTER UPDATE ON purchase_returns
  FOR EACH ROW
  EXECUTE FUNCTION process_return_approval();

-- RLS Policies (Row Level Security)
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view returns
CREATE POLICY "Allow authenticated users to view returns"
  ON purchase_returns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to view return items"
  ON purchase_return_items FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow purchasing roles to create returns
CREATE POLICY "Allow purchasing roles to create returns"
  ON purchase_returns FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' IN ('purchasing_manager', 'purchasing_staff', 'purchasing_admin')
  );

CREATE POLICY "Allow purchasing roles to create return items"
  ON purchase_return_items FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' IN ('purchasing_manager', 'purchasing_staff', 'purchasing_admin')
  );

-- Policy: Allow purchasing manager to approve returns
CREATE POLICY "Allow purchasing manager to update returns"
  ON purchase_returns FOR UPDATE
  TO authenticated
  USING (
    auth.jwt()->>'role' IN ('purchasing_manager', 'purchasing_admin')
  );

-- Comments
COMMENT ON TABLE purchase_returns IS 'Purchase return transactions for returning goods to suppliers';
COMMENT ON TABLE purchase_return_items IS 'Individual items in a purchase return';
COMMENT ON COLUMN purchase_returns.reason_type IS 'Reason for return: damaged, wrong_item, expired, overstock, specification_mismatch, other';
COMMENT ON COLUMN purchase_returns.status IS 'Workflow status: draft, pending_approval, approved, rejected, completed, cancelled';
COMMENT ON COLUMN purchase_return_items.qc_status IS 'QC decision: rejected, partially_rejected';
