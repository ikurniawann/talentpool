-- ============================================================
-- Purchasing Module Migration
-- Phase 2: Core Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. DEPARTMENTS (Master Data)
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  head_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default departments
INSERT INTO departments (code, name) VALUES
  ('HR', 'Human Resources'),
  ('FIN', 'Finance'),
  ('IT', 'Information Technology'),
  ('OPS', 'Operations'),
  ('MKT', 'Marketing'),
  ('ADM', 'Administration')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. VENDORS (Master Data)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('it', 'office', 'stationery', 'services', 'raw_material', 'other')),
  npwp TEXT,
  bank_name TEXT,
  bank_account TEXT,
  bank_account_name TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PURCHASE REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number TEXT UNIQUE NOT NULL,
  requester_id UUID NOT NULL,
  department_id UUID REFERENCES departments(id) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_head', 'pending_finance', 'pending_direksi', 'approved', 'rejected', 'converted')),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  required_date DATE,
  current_approval_level TEXT,
  approved_by_head UUID,
  approved_at_head TIMESTAMPTZ,
  approved_by_finance UUID,
  approved_at_finance TIMESTAMPTZ,
  approved_by_direksi UUID,
  approved_at_direksi TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  converted_po_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. PR ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS pr_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL,
  product_id UUID,
  description TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit TEXT NOT NULL,
  estimated_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0
);

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_items ENABLE ROW LEVEL SECURITY;

-- Departments: Everyone can view active
DROP POLICY IF EXISTS "Everyone can view active departments" ON departments;
CREATE POLICY "Everyone can view active departments"
  ON departments FOR SELECT
  USING (is_active = true);

-- Vendors: Everyone can view active
DROP POLICY IF EXISTS "Everyone can view active vendors" ON vendors;
CREATE POLICY "Everyone can view active vendors"
  ON vendors FOR SELECT
  USING (is_active = true);

-- Purchase Requests: Complex policies
DROP POLICY IF EXISTS "Users can view PRs from their dept or all if admin" ON purchase_requests;
CREATE POLICY "Users can view PRs from their dept or all if admin"
  ON purchase_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hrd', 'purchasing_manager', 'direksi', 'finance_staff')
    )
  );

DROP POLICY IF EXISTS "Users can create their own PRs" ON purchase_requests;
CREATE POLICY "Users can create their own PRs"
  ON purchase_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Requester can update draft PRs" ON purchase_requests;
CREATE POLICY "Requester can update draft PRs"
  ON purchase_requests FOR UPDATE
  USING (
    (requester_id = auth.uid() AND status = 'draft') OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hrd', 'purchasing_manager', 'direksi', 'finance_staff')
    )
  );

-- PR Items: Cascade with PR permissions
DROP POLICY IF EXISTS "Users can view PR items they have access to" ON pr_items;
CREATE POLICY "Users can view PR items they have access to"
  ON pr_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_requests pr 
      WHERE pr.id = pr_items.pr_id 
      AND (pr.requester_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('hrd', 'purchasing_manager', 'direksi', 'finance_staff')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert PR items for their PRs" ON pr_items;
CREATE POLICY "Users can insert PR items for their PRs"
  ON pr_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_requests pr 
      WHERE pr.id = pr_items.pr_id 
      AND pr.requester_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete PR items for their draft PRs" ON pr_items;
CREATE POLICY "Users can delete PR items for their draft PRs"
  ON pr_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM purchase_requests pr 
      WHERE pr.id = pr_items.pr_id 
      AND pr.requester_id = auth.uid() 
      AND pr.status = 'draft'
    )
  );

-- ============================================================
-- 6. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pr_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_requester ON purchase_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_pr_department ON purchase_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_pr_created ON purchase_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_items_pr_id ON pr_items(pr_id);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_purchase_requests_updated_at ON purchase_requests;
CREATE TRIGGER update_purchase_requests_updated_at
    BEFORE UPDATE ON purchase_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. HELPER FUNCTION: Generate PR Number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_pr_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    last_num INTEGER;
    new_num INTEGER;
BEGIN
    year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(pr_number, '-', 3) AS INTEGER)),
        0
    )
    INTO last_num
    FROM purchase_requests
    WHERE pr_number LIKE 'PR-' || year || '-%';
    
    new_num := last_num + 1;
    
    RETURN 'PR-' || year || '-' || LPAD(new_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. HELPER FUNCTION: Generate PO Number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    last_num INTEGER;
    new_num INTEGER;
BEGIN
    year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Will error if purchase_orders table doesn't exist, that's OK for now
    RETURN 'PO-' || year || '-' || '00001';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. SEED DATA: Sample Vendors
-- ============================================================
INSERT INTO vendors (code, name, contact_person, phone, email, address, category, is_active) VALUES
  ('V-2024-0001', 'PT Indo Komputer', 'Budi Santoso', '081234567890', 'budi@indokomputer.co.id', 'Jl. Sudirman No. 123, Jakarta', 'it', true),
  ('V-2024-0002', 'CV Stationery Jaya', 'Siti Aminah', '082345678901', 'siti@stationeryjaya.com', 'Jl. Thamrin No. 45, Jakarta', 'office', true),
  ('V-2024-0003', 'PT Office Solutions', 'Agus Wijaya', '083456789012', 'agus@officesolutions.co.id', 'Jl. Gatot Subroto Kav. 78, Jakarta', 'office', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Migration Complete
-- ============================================================
