-- ============================================================
-- HRIS Foundation - Fase 0 (VERSION 2 - FIXED)
-- Employee Master Table + Organization Structure
-- ============================================================
-- Migration untuk membangun pondasi HRIS yang robust
-- Mengintegrasikan Talent Pool → Employee
-- FIX: Handle case tabel users tidak punya brand_id

-- ============================================================
-- 0. FIX TABLE users (Add brand_id if not exists)
-- ============================================================

-- Add brand_id to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

-- ============================================================
-- 1. TABEL DEPARTMENTS (Struktur Organisasi Level Atas)
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  cost_center TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. TABEL EMPLOYEES (MASTER TABLE - menggantikan/mengextend staff)
-- ============================================================

-- Employment status enum type
DO $$ BEGIN
  CREATE TYPE employment_status AS ENUM (
    'probation',
    'contract',
    'permanent',
    'internship',
    'resigned',
    'terminated',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Gender enum type
DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('male', 'female');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Marital status enum type
DO $$ BEGIN
  CREATE TYPE marital_status_type AS ENUM ('single', 'married', 'divorced', 'widowed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS employees (
  -- Core Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  
  -- Personal Information
  full_name TEXT NOT NULL,
  nip TEXT UNIQUE NOT NULL,
  ktp TEXT UNIQUE,
  npwp TEXT UNIQUE,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  birth_date DATE,
  gender gender_type,
  marital_status marital_status_type,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  
  -- Employment Information
  join_date DATE NOT NULL,
  end_date DATE,
  employment_status employment_status NOT NULL DEFAULT 'probation',
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Organization Structure
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  job_title_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  reporting_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- Compensation & Benefits
  bank_name TEXT,
  bank_account TEXT,
  bpjs_tk TEXT,
  bpjs_kesehatan TEXT,
  
  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Metadata
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. ALTER TABLE CANDIDATES (Integrasi Talent Pool → Employee)
-- ============================================================

ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS promoted_to_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS promotion_date TIMESTAMPTZ;

-- ============================================================
-- 4. FUNCTION: GENERATE NIP OTOMATIS
-- ============================================================
-- Format: EMP-YYYY-XXXXX (contoh: EMP-2026-00001)

CREATE OR REPLACE FUNCTION generate_nip()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence TEXT;
  v_new_nip TEXT;
  v_max_seq INTEGER;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get next sequence number for this year
  SELECT MAX(CAST(SUBSTRING(nip FROM ('EMP-' || v_year || '-(\\d+)$')) AS INTEGER))
  INTO v_max_seq
  FROM employees
  WHERE nip LIKE ('EMP-' || v_year || '-%');
  
  -- Calculate next sequence (pad with zeros)
  v_sequence := LPAD((COALESCE(v_max_seq, 0) + 1)::TEXT, 5, '0');
  
  -- Build NIP
  v_new_nip := 'EMP-' || v_year || '-' || v_sequence;
  
  RETURN v_new_nip;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. FUNCTION: AUTO-SET NIP BEFORE INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION set_employee_nip()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nip IS NULL OR NEW.nip = '' THEN
    NEW.nip := generate_nip();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 6. TRIGGER: AUTO NIP GENERATION
-- ============================================================

CREATE TRIGGER employees_set_nip_before_insert
  BEFORE INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION set_employee_nip();

-- ============================================================
-- 7. TRIGGER: AUTO UPDATE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- ============================================================
-- 8. FUNCTION: PROMOTE CANDIDATE TO EMPLOYEE
-- ============================================================
-- Function untuk integrasi Talent Pool → Employee

CREATE OR REPLACE FUNCTION promote_candidate_to_employee(
  p_candidate_id UUID,
  p_join_date DATE DEFAULT CURRENT_DATE,
  p_employment_status employment_status DEFAULT 'probation',
  p_department_id UUID DEFAULT NULL,
  p_reporting_to UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_candidate RECORD;
  v_employee_id UUID;
BEGIN
  -- Get candidate data
  SELECT * INTO v_candidate
  FROM candidates
  WHERE id = p_candidate_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found: %', p_candidate_id;
  END IF;
  
  IF v_candidate.status != 'hired' AND v_candidate.status != 'talent_pool' THEN
    RAISE EXCEPTION 'Candidate status must be "hired" or "talent_pool" to promote. Current status: %', v_candidate.status;
  END IF;
  
  -- Create employee
  INSERT INTO employees (
    full_name,
    email,
    phone,
    join_date,
    employment_status,
    department_id,
    job_title_id,
    reporting_to,
    address,
    photo_url
  ) VALUES (
    v_candidate.full_name,
    v_candidate.email,
    v_candidate.phone,
    p_join_date,
    p_employment_status,
    p_department_id,
    v_candidate.position_id,
    p_reporting_to,
    v_candidate.domicile,
    v_candidate.photo_url
  )
  RETURNING id INTO v_employee_id;
  
  -- Update candidate record
  UPDATE candidates
  SET 
    promoted_to_employee_id = v_employee_id,
    promotion_date = NOW()
  WHERE id = p_candidate_id;
  
  RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. INDEXES (Performa)
-- ============================================================

-- Departments
CREATE INDEX IF NOT EXISTS idx_departments_brand ON departments(brand_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_nip ON employees(nip);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_old_staff ON employees(old_staff_id);
CREATE INDEX IF NOT EXISTS idx_employees_ktp ON employees(ktp);
CREATE INDEX IF NOT EXISTS idx_employees_npwp ON employees(npwp);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_section ON employees(section_id);
CREATE INDEX IF NOT EXISTS idx_employees_job_title ON employees(job_title_id);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_to ON employees(reporting_to);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_join_date ON employees(join_date);

-- Candidates (promotion tracking)
CREATE INDEX IF NOT EXISTS idx_candidates_promoted ON candidates(promoted_to_employee_id);

-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is HRD
CREATE OR REPLACE FUNCTION is_hrd()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_role = 'hrd', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if current user is manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_role IN ('hrd', 'hiring_manager'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user's employee ID
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  SELECT id INTO v_employee_id
  FROM employees
  WHERE user_id = auth.uid();
  
  RETURN v_employee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get current user's brand ID (single value, nullable)
CREATE OR REPLACE FUNCTION current_user_brand_id()
RETURNS UUID AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  SELECT brand_id INTO v_brand_id
  FROM users
  WHERE id = auth.uid();
  
  RETURN v_brand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. RLS POLICIES - DEPARTMENTS
-- ============================================================

-- HRD: Full access
CREATE POLICY "HRD full access to departments"
  ON departments FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);

-- Manager: Read access (simplified - read all if is_manager)
CREATE POLICY "Manager read access to departments"
  ON departments FOR SELECT
  USING (is_manager() = true);

-- Employee: Read active departments only
CREATE POLICY "Employee read access to departments"
  ON departments FOR SELECT
  USING (is_active = true);

-- ============================================================
-- 12. RLS POLICIES - EMPLOYEES
-- ============================================================

-- HRD: Full access to all employees
CREATE POLICY "HRD full access to employees"
  ON employees FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);

-- Manager: Read all employees (simplified for now)
CREATE POLICY "Manager read employees"
  ON employees FOR SELECT
  USING (is_manager() = true);

-- Employee: Read own data only
CREATE POLICY "Employee read self"
  ON employees FOR SELECT
  USING (id = current_employee_id());

-- Insert: Only HRD can create employees
CREATE POLICY "HRD insert employees"
  ON employees FOR INSERT
  WITH CHECK (is_hrd() = true);

-- Update: Only HRD can update employees
CREATE POLICY "HRD update employees"
  ON employees FOR UPDATE
  USING (is_hrd() = true);

-- Delete: Only HRD can delete (soft delete via is_active)
CREATE POLICY "HRD delete employees"
  ON employees FOR DELETE
  USING (is_hrd() = true);

-- ============================================================
-- 13. COMMENTS (Dokumentasi)
-- ============================================================

COMMENT ON TABLE departments IS 'Struktur organisasi - department/divisi';
COMMENT ON TABLE employees IS 'Master data karyawan - menggantikan tabel staff';
COMMENT ON COLUMN employees.nip IS 'Nomor Induk Karyawan - auto-generated format EMP-YYYY-XXXXX';
COMMENT ON COLUMN employees.old_staff_id IS 'Reference ke tabel staff lama untuk migrasi data';
COMMENT ON FUNCTION promote_candidate_to_employee IS 'Promote kandidat dari Talent Pool menjadi Employee';
COMMENT ON FUNCTION generate_nip IS 'Generate NIP otomatis dengan format EMP-YYYY-XXXXX';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
