-- ============================================================
-- HRIS FASE 2: Employee Management
-- Tables: employee_documents, employment_history
-- ============================================================

-- ============================================================
-- 1. EMPLOYEE DOCUMENTS
-- Store uploaded documents per employee
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Document Info
  document_type varchar(50) NOT NULL, -- 'ktp', 'npwp', 'ijazah', 'cv', 'kontrak', 'bpjs_tk', 'bpjs_kes', 'other'
  document_name varchar(255) NOT NULL,
  file_url text NOT NULL,
  file_size_kb integer,
  mime_type varchar(100),

  -- Validity
  issue_date date,
  expiry_date date,
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES employees(id),
  verified_at timestamptz,

  -- Notes
  notes text,

  -- Audit
  uploaded_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type);

-- RLS
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all employee_documents" ON employee_documents FOR ALL USING (true);

-- ============================================================
-- 2. EMPLOYMENT HISTORY
-- Track position changes, promotions, transfers
-- ============================================================
CREATE TABLE IF NOT EXISTS employment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Change Details
  change_type varchar(50) NOT NULL, -- 'hire', 'promotion', 'transfer', 'demotion', 'status_change', 'salary_change'
  effective_date date NOT NULL,

  -- Previous State
  prev_department_id uuid REFERENCES departments(id),
  prev_section_id uuid REFERENCES sections(id),
  prev_job_title_id uuid REFERENCES positions(id),
  prev_employment_status varchar(50),
  prev_salary decimal(15,2),

  -- New State
  new_department_id uuid REFERENCES departments(id),
  new_section_id uuid REFERENCES sections(id),
  new_job_title_id uuid REFERENCES positions(id),
  new_employment_status varchar(50),
  new_salary decimal(15,2),

  -- Reason & Notes
  reason text,
  notes text,

  -- Audit
  recorded_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_employment_history_employee ON employment_history(employee_id);
CREATE INDEX idx_employment_history_date ON employment_history(effective_date);

-- RLS
ALTER TABLE employment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all employment_history" ON employment_history FOR ALL USING (true);

-- ============================================================
-- 3. AUTO-TRIGGER: Record hire event on new employee
-- ============================================================
CREATE OR REPLACE FUNCTION fn_record_employee_hire()
RETURNS trigger AS $$
BEGIN
  INSERT INTO employment_history (
    employee_id,
    change_type,
    effective_date,
    new_department_id,
    new_section_id,
    new_job_title_id,
    new_employment_status,
    reason
  ) VALUES (
    NEW.id,
    'hire',
    NEW.join_date,
    NEW.department_id,
    NEW.section_id,
    NEW.job_title_id,
    NEW.employment_status,
    'Bergabung sebagai karyawan baru'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_record_employee_hire
  AFTER INSERT ON employees
  FOR EACH ROW EXECUTE FUNCTION fn_record_employee_hire();

-- ============================================================
-- 4. STORAGE BUCKET (run in Supabase dashboard if needed)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false)
-- ON CONFLICT (id) DO NOTHING;
