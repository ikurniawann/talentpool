-- ============================================================
-- HRIS Fase 1 - Core HR Operations
-- Migration: Attendance, Leaves, Onboarding, Offboarding, Scheduling
-- ============================================================
-- Author: Arkiv OS Development Team
-- Date: 2026-05-04
-- Dependencies: 007_hris_foundation_fixed.sql (Fase 0)
-- ============================================================

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

-- Attendance status
DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM (
    'present',
    'late',
    'absent',
    'half-day',
    'remote'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Leave types
DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM (
    'annual',
    'sick',
    'maternity',
    'paternity',
    'unpaid',
    'emergency',
    'pilgrimage',
    'menstrual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Leave status (approval workflow)
DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Onboarding category
DO $$ BEGIN
  CREATE TYPE onboarding_category AS ENUM (
    'admin',
    'it',
    'hr',
    'manager',
    'general'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Resignation type
DO $$ BEGIN
  CREATE TYPE resignation_type AS ENUM (
    'voluntary',
    'termination',
    'layoff',
    'end_of_contract'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Offboarding status
DO $$ BEGIN
  CREATE TYPE offboarding_status AS ENUM (
    'submitted',
    'notice_period',
    'exit_interview',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Shift type for scheduling
DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM (
    'morning',
    'afternoon',
    'night',
    'flexible',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. TABEL ATTENDANCE (Absensi & Timesheet)
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Clock In/Out
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  
  -- Location data (GPS + IP)
  clock_in_location JSONB, -- {latitude, longitude, accuracy, address, ip_address, user_agent}
  clock_out_location JSONB,
  
  -- Work hours calculation
  work_hours NUMERIC(5,2), -- in hours, e.g., 8.50
  break_minutes INTEGER DEFAULT 60,
  
  -- Status
  status attendance_status NOT NULL DEFAULT 'present',
  is_late BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  is_overtime BOOLEAN DEFAULT false,
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  
  -- Validation
  validated_by UUID REFERENCES employees(id),
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT attendance_employee_date_unique UNIQUE(employee_id, date),
  CONSTRAINT work_hours_positive CHECK (work_hours >= 0),
  CONSTRAINT late_minutes_positive CHECK (late_minutes >= 0)
);

-- Indexes for attendance
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_created ON attendance(created_at);

-- ============================================================
-- 3. TABEL LEAVES (Cuti & Izin)
-- ============================================================

CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Leave details
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,2) NOT NULL, -- auto-calculated
  
  -- Reason & attachment
  reason TEXT NOT NULL,
  attachment_url TEXT, -- surat dokter, dll
  
  -- Approval workflow (Manager only)
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id), -- Manager who approved
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT leave_dates_valid CHECK (end_date >= start_date),
  CONSTRAINT total_days_positive CHECK (total_days > 0)
);

-- Indexes for leaves
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaves_type ON leaves(leave_type);
CREATE INDEX IF NOT EXISTS idx_leaves_created ON leaves(created_at);

-- ============================================================
-- 4. TABEL LEAVE_BALANCES (Quota Cuti Tahunan)
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  
  -- Annual leave quota
  annual_leave_total NUMERIC(5,2) NOT NULL DEFAULT 12, -- Default 12 days per year
  annual_leave_used NUMERIC(5,2) NOT NULL DEFAULT 0,
  annual_leave_remaining NUMERIC(5,2) GENERATED ALWAYS AS (
    annual_leave_total - annual_leave_used
  ) STORED,
  
  -- Other leaves (tracking only, not quota-based)
  sick_leave_used NUMERIC(5,2) NOT NULL DEFAULT 0,
  unpaid_leave_used NUMERIC(5,2) NOT NULL DEFAULT 0,
  maternity_leave_used NUMERIC(5,2) NOT NULL DEFAULT 0,
  paternity_leave_used NUMERIC(5,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT leave_balance_year_valid CHECK (year >= 2020),
  CONSTRAINT annual_leave_non_negative CHECK (annual_leave_remaining >= 0),
  CONSTRAINT leave_balance_unique UNIQUE(employee_id, year)
);

-- Indexes for leave_balances
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

-- ============================================================
-- 5. TABEL ONBOARDING_CHECKLISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Task details
  task_name TEXT NOT NULL,
  category onboarding_category NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 3, -- 1=high, 2=medium, 3=low
  
  -- Due date
  due_date DATE,
  due_days_after_join INTEGER DEFAULT 7, -- auto calc due_date
  
  -- Completion tracking
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id), -- Who marked as complete
  completion_notes TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES employees(id), -- Who is responsible to ensure completion
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT priority_valid CHECK (priority BETWEEN 1 AND 3)
);

-- Indexes for onboarding_checklists
CREATE INDEX IF NOT EXISTS idx_onboarding_employee ON onboarding_checklists(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding_checklists(completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_category ON onboarding_checklists(category);
CREATE INDEX IF NOT EXISTS idx_onboarding_due_date ON onboarding_checklists(due_date);

-- ============================================================
-- 6. TABEL OFFBOARDING_CHECKLISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS offboarding_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Resignation details
  resignation_type resignation_type NOT NULL,
  resignation_date DATE NOT NULL,
  last_working_day DATE NOT NULL,
  reason TEXT,
  
  -- Status
  status offboarding_status NOT NULL DEFAULT 'submitted',
  
  -- Exit interview
  exit_interview_date DATE,
  exit_interview_conducted_by UUID REFERENCES employees(id),
  exit_interview_notes TEXT,
  
  -- Final payroll
  final_payroll_date DATE,
  final_payroll_amount NUMERIC(12,2),
  final_payroll_notes TEXT,
  
  -- Asset return (JSONB for flexibility)
  asset_return_status JSONB DEFAULT '{}', 
  -- Example: {"laptop": true, "id_card": false, "access_card": true, "keys": true}
  
  -- Clearances from departments
  clearance_hrd BOOLEAN DEFAULT false,
  clearance_hrd_notes TEXT,
  clearance_it BOOLEAN DEFAULT false,
  clearance_it_notes TEXT,
  clearance_finance BOOLEAN DEFAULT false,
  clearance_finance_notes TEXT,
  clearance_manager BOOLEAN DEFAULT false,
  clearance_manager_notes TEXT,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT offboarding_dates_valid CHECK (last_working_day >= resignation_date)
);

-- Indexes for offboarding_checklists
CREATE INDEX IF NOT EXISTS idx_offboarding_employee ON offboarding_checklists(employee_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_status ON offboarding_checklists(status);
CREATE INDEX IF NOT EXISTS idx_offboarding_dates ON offboarding_checklists(resignation_date, last_working_day);

-- ============================================================
-- 7. TABEL EMPLOYEE_SCHEDULES (Upgrade dari staff_schedules)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Schedule details
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Shift info
  shift_type shift_type NOT NULL DEFAULT 'custom',
  break_minutes INTEGER NOT NULL DEFAULT 60,
  is_off BOOLEAN NOT NULL DEFAULT false,
  
  -- Overtime allowance
  overtime_allowed BOOLEAN DEFAULT false,
  max_overtime_hours NUMERIC(5,2) DEFAULT 0,
  
  -- Effective period
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE, -- NULL = indefinite
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT schedule_time_valid CHECK (end_time > start_time),
  CONSTRAINT break_minutes_positive CHECK (break_minutes >= 0),
  CONSTRAINT employee_schedule_unique UNIQUE(employee_id, day_of_week, effective_from)
);

-- Indexes for employee_schedules
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_day ON employee_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_effective ON employee_schedules(effective_from, effective_to);

-- ============================================================
-- 8. FUNCTIONS & TRIGGERS
-- ============================================================

-- FUNCTION: Calculate work hours from clock_in/clock_out
CREATE OR REPLACE FUNCTION calculate_work_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    -- Calculate hours between clock_in and clock_out, minus break time
    NEW.work_hours := ROUND(
      (EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0) 
      - (COALESCE(NEW.break_minutes, 60) / 60.0),
      2
    );
    
    -- Ensure work_hours doesn't go negative
    IF NEW.work_hours < 0 THEN
      NEW.work_hours := 0;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Auto-calculate work hours before insert/update
DROP TRIGGER IF EXISTS attendance_calculate_work_hours ON attendance;
CREATE TRIGGER attendance_calculate_work_hours
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_work_hours();

-- FUNCTION: Calculate total days for leave
CREATE OR REPLACE FUNCTION calculate_leave_days()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    -- Calculate business days (exclude weekends)
    NEW.total_days := (
      SELECT COUNT(*)::NUMERIC
      FROM GENERATE_SERIES(NEW.start_date, NEW.end_date, '1 day'::INTERVAL) AS d(date)
      WHERE EXTRACT(DOW FROM d.date) NOT IN (0, 6) -- Exclude Sunday (0) and Saturday (6)
    );
    
    -- Ensure at least 1 day
    IF NEW.total_days < 1 THEN
      NEW.total_days := 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Auto-calculate leave days before insert/update
DROP TRIGGER IF EXISTS leaves_calculate_total_days ON leaves;
CREATE TRIGGER leaves_calculate_total_days
  BEFORE INSERT OR UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION calculate_leave_days();

-- FUNCTION: Auto-generate onboarding checklist for new employee
CREATE OR REPLACE FUNCTION generate_onboarding_checklist()
RETURNS TRIGGER AS $$
DECLARE
  v_join_date DATE;
BEGIN
  v_join_date := COALESCE(NEW.join_date, CURRENT_DATE);
  
  -- Insert default onboarding tasks
  INSERT INTO onboarding_checklists (
    employee_id,
    task_name,
    category,
    description,
    due_date,
    due_days_after_join,
    priority
  ) VALUES
  -- HR Tasks
  (NEW.id, 'Submit KTP & NPWP', 'hr', 'Upload scan KTP dan NPWP', v_join_date + INTERVAL '7 days', 7, 1),
  (NEW.id, 'Submit Foto Profil', 'hr', 'Foto formal 3x4 dan 4x6', v_join_date + INTERVAL '7 days', 7, 2),
  (NEW.id, 'Sign Kontrak Kerja', 'hr', 'Tanda tangan kontrak kerja', v_join_date + INTERVAL '3 days', 3, 1),
  (NEW.id, 'Registrasi BPJS', 'hr', 'Daftar BPJS Kesehatan & Ketenagakerjaan', v_join_date + INTERVAL '14 days', 14, 2),
  
  -- IT Tasks
  (NEW.id, 'Setup Email Perusahaan', 'it', 'Aktivasi email @arkiv.co.id', v_join_date + INTERVAL '1 day', 1, 1),
  (NEW.id, 'Setup Laptop & Equipment', 'it', 'Penerimaan laptop dan perlengkapan', v_join_date, 0, 1),
  (NEW.id, 'Access System & Tools', 'it', 'Akses Slack, GitHub, Jira, dll', v_join_date + INTERVAL '1 day', 1, 1),
  
  -- Manager Tasks
  (NEW.id, 'Team Introduction', 'manager', 'Perkenalan dengan tim', v_join_date, 0, 1),
  (NEW.id, 'Job Description Review', 'manager', 'Review JD dan ekspektasi kinerja', v_join_date + INTERVAL '3 days', 3, 2),
  (NEW.id, 'Goal Setting (30-60-90 days)', 'manager', 'Set goals untuk 30/60/90 hari pertama', v_join_date + INTERVAL '7 days', 7, 2),
  
  -- Admin Tasks
  (NEW.id, 'ID Card & Access Card', 'admin', 'Pembuatan kartu identitas dan akses', v_join_date + INTERVAL '3 days', 3, 2),
  (NEW.id, 'Locker & Workspace Setup', 'admin', 'Penyiapan locker dan workspace', v_join_date, 0, 2);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Generate onboarding checklist when employee is created
DROP TRIGGER IF EXISTS employees_generate_onboarding ON employees;
CREATE TRIGGER employees_generate_onboarding
  AFTER INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION generate_onboarding_checklist();

-- FUNCTION: Update employee status when offboarding is completed
CREATE OR REPLACE FUNCTION update_employee_offboarding_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update employee status to resigned
    UPDATE employees
    SET 
      employment_status = 'resigned',
      is_active = false,
      end_date = NEW.last_working_day,
      updated_at = NOW()
    WHERE id = NEW.employee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER: Update employee status when offboarding completed
DROP TRIGGER IF EXISTS offboarding_complete_update_employee ON offboarding_checklists;
CREATE TRIGGER offboarding_complete_update_employee
  AFTER UPDATE ON offboarding_checklists
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_employee_offboarding_status();

-- FUNCTION: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hris_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS: Auto-update updated_at
CREATE TRIGGER attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_hris_updated_at();

CREATE TRIGGER leaves_updated_at
  BEFORE UPDATE ON leaves
  FOR EACH ROW
  EXECUTE FUNCTION update_hris_updated_at();

CREATE TRIGGER leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_hris_updated_at();

CREATE TRIGGER employee_schedules_updated_at
  BEFORE UPDATE ON employee_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_hris_updated_at();

-- ============================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE offboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;

-- Helper functions (reuse from Fase 0)
-- is_hrd(), is_manager(), current_employee_id(), current_user_brand_ids()

-- ============================================================
-- RLS POLICIES - ATTENDANCE
-- ============================================================

-- HRD: Full access to all attendance
CREATE POLICY "HRD full access to attendance"
  ON attendance FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);

-- Manager: Read attendance of their department employees
CREATE POLICY "Manager read attendance in department"
  ON attendance FOR SELECT
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
      OR employee_id = current_employee_id()
    )
  );

-- Employee: Read own attendance, insert own clock-in/out
CREATE POLICY "Employee read self attendance"
  ON attendance FOR SELECT
  USING (employee_id = current_employee_id());

CREATE POLICY "Employee clock in/out"
  ON attendance FOR INSERT
  WITH CHECK (employee_id = current_employee_id());

CREATE POLICY "Employee update own clock_out"
  ON attendance FOR UPDATE
  USING (employee_id = current_employee_id())
  WITH CHECK (employee_id = current_employee_id());

-- ============================================================
-- RLS POLICIES - LEAVES
-- ============================================================

-- HRD: Full access to all leaves
CREATE POLICY "HRD full access to leaves"
  ON leaves FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);

-- Manager: Read leaves of their department, approve/reject
CREATE POLICY "Manager read leaves in department"
  ON leaves FOR SELECT
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
      OR employee_id = current_employee_id()
    )
  );

CREATE POLICY "Manager approve leaves"
  ON leaves FOR UPDATE
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
    )
  );

-- Employee: Read own leaves, create leave requests
CREATE POLICY "Employee read self leaves"
  ON leaves FOR SELECT
  USING (employee_id = current_employee_id());

CREATE POLICY "Employee create leave request"
  ON leaves FOR INSERT
  WITH CHECK (employee_id = current_employee_id());

-- ============================================================
-- RLS POLICIES - LEAVE_BALANCES
-- ============================================================

-- HRD: Full access
CREATE POLICY "HRD full access to leave_balances"
  ON leave_balances FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);

-- Manager: Read balances of their department
CREATE POLICY "Manager read leave_balances in department"
  ON leave_balances FOR SELECT
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
      OR employee_id = current_employee_id()
    )
  );

-- Employee: Read own balance
CREATE POLICY "Employee read self leave_balances"
  ON leave_balances FOR SELECT
  USING (employee_id = current_employee_id());

-- ============================================================
-- RLS POLICIES - ONBOARDING_CHECKLISTS
-- ============================================================

-- HRD: Full access
CREATE POLICY "HRD full access to onboarding_checklists"
  ON onboarding_checklists FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);

-- Manager: Read/Update onboarding for their department
CREATE POLICY "Manager read onboarding in department"
  ON onboarding_checklists FOR SELECT
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
    )
  );

CREATE POLICY "Manager update onboarding"
  ON onboarding_checklists FOR UPDATE
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
    )
  );

-- Employee: Read own onboarding checklist
CREATE POLICY "Employee read self onboarding"
  ON onboarding_checklists FOR SELECT
  USING (employee_id = current_employee_id());

-- ============================================================
-- RLS POLICIES - OFFBOARDING_CHECKLISTS
-- ============================================================

-- HRD: Full access
CREATE POLICY "HRD full access to offboarding_checklists"
  ON offboarding_checklists FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);

-- Manager: Read/Update offboarding for their department
CREATE POLICY "Manager read offboarding in department"
  ON offboarding_checklists FOR SELECT
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
    )
  );

CREATE POLICY "Manager update offboarding"
  ON offboarding_checklists FOR UPDATE
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
    )
  );

-- Employee: Read own offboarding checklist
CREATE POLICY "Employee read self offboarding"
  ON offboarding_checklists FOR SELECT
  USING (employee_id = current_employee_id());

-- ============================================================
-- RLS POLICIES - EMPLOYEE_SCHEDULES
-- ============================================================

-- HRD: Full access
CREATE POLICY "HRD full access to employee_schedules"
  ON employee_schedules FOR ALL
  USING (is_hrd() = true)
  WITH CHECK (is_hrd() = true);

-- Manager: Read schedules of their department
CREATE POLICY "Manager read employee_schedules in department"
  ON employee_schedules FOR SELECT
  USING (
    is_manager() = true AND (
      employee_id IN (
        SELECT id FROM employees 
        WHERE department_id IN (
          SELECT id FROM departments 
          WHERE brand_id = ANY(current_user_brand_ids())
        )
      )
    )
  );

-- Employee: Read own schedule
CREATE POLICY "Employee read self schedule"
  ON employee_schedules FOR SELECT
  USING (employee_id = current_employee_id());

-- ============================================================
-- 10. COMMENTS (Documentation)
-- ============================================================

COMMENT ON TABLE attendance IS 'Absensi & timesheet karyawan dengan GPS tracking';
COMMENT ON TABLE leaves IS 'Pengajuan cuti/izin/sakit dengan approval workflow';
COMMENT ON TABLE leave_balances IS 'Quota cuti tahunan per karyawan per tahun';
COMMENT ON TABLE onboarding_checklists IS 'Checklist onboarding untuk karyawan baru';
COMMENT ON TABLE offboarding_checklists IS 'Checklist resign/termination dengan asset return';
COMMENT ON TABLE employee_schedules IS 'Jadwal kerja karyawan (upgrade dari staff_schedules)';

COMMENT ON COLUMN attendance.clock_in_location IS 'GPS location saat clock-in: {latitude, longitude, accuracy, address, ip_address}';
COMMENT ON COLUMN attendance.work_hours IS 'Total jam kerja (clock_out - clock_in - break)';
COMMENT ON COLUMN leaves.total_days IS 'Total hari cuti (exclude weekends)';
COMMENT ON COLUMN offboarding_checklists.asset_return_status IS 'JSON object tracking asset return: {laptop: true, id_card: false, ...}';

-- ============================================================
-- 11. SEED DATA (Optional - Default Leave Quotas)
-- ============================================================

-- Note: Leave balances will be auto-created per employee via function/trigger
-- This can be added in a separate migration or manually

-- ============================================================
-- END OF MIGRATION - FASE 1 COMPLETE
-- ============================================================
