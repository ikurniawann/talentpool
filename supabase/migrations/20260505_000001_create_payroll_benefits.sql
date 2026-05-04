-- ============================================================
-- FASE 2: Payroll & Benefits
-- Migration: Create Payroll & Benefits Tables
-- Date: 2026-05-05
-- Compliance: Indonesia 2026 (PPh 21 ETR, BPJS, THR, Tapera)
-- ============================================================

-- ============================================================
-- 1. PAYROLL SETTINGS (Company-wide configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  npwp TEXT,
  currency TEXT DEFAULT 'IDR',
  
  -- BPJS Ketenagakerjaan (2026 rates)
  bpjs_tk_jht_employee NUMERIC(5,2) DEFAULT 2.00, -- 2% dari upah
  bpjs_tk_jht_employer NUMERIC(5,2) DEFAULT 3.70, -- 3.7% dari upah
  bpjs_tk_jp_employee NUMERIC(5,2) DEFAULT 1.00, -- 1% dari upah (jika upah >= 5jt)
  bpjs_tk_jp_employer NUMERIC(5,2) DEFAULT 2.00, -- 2% dari upah
  bpjs_tk_jkk NUMERIC(5,2) DEFAULT 0.24, -- 0.24% dari upah (risk-dependent)
  bpjs_tk_jkm NUMERIC(5,2) DEFAULT 0.30, -- 0.30% dari upah
  
  -- BPJS Kesehatan (2026 rates)
  bpjs_kes_employee NUMERIC(5,2) DEFAULT 1.00, -- 1% dari upah
  bpjs_kes_employer NUMERIC(5,2) DEFAULT 4.00, -- 4% dari upah
  bpjs_kes_max_upah NUMERIC(12,2) DEFAULT 12000000, -- Cap upah untuk BPJS
  
  -- Tapera (Tabungan Perumahan Rakyat)
  tapera_employee NUMERIC(5,2) DEFAULT 2.50, -- 2.5% dari upah
  tapera_employer NUMERIC(5,2) DEFAULT 0.50, -- 0.5% dari upah
  
  -- PPh 21 ETR brackets (2026 progressive rates)
  pph21_bracket_1 NUMERIC(12,2) DEFAULT 60000000, -- 0-60jt: 5%
  pph21_bracket_2 NUMERIC(12,2) DEFAULT 250000000, -- 60-250jt: 15%
  pph21_bracket_3 NUMERIC(12,2) DEFAULT 500000000, -- 250-500jt: 25%
  pph21_bracket_4 NUMERIC(12,2) DEFAULT 5000000000, -- 500jt-5M: 30%
  pph21_bracket_5 NUMERIC(12,2) DEFAULT 5000000000, -- >5M: 35%
  
  -- PTKP (Penghasilan Tidak Kena Pajak) 2026
  ptkp_tk_0 NUMERIC(12,2) DEFAULT 54000000, -- TK/0
  ptkp_tk_1 NUMERIC(12,2) DEFAULT 58500000, -- TK/1
  ptkp_tk_2 NUMERIC(12,2) DEFAULT 63000000, -- TK/2
  ptkp_tk_3 NUMERIC(12,2) DEFAULT 67500000, -- TK/3
  ptkp_k_0 NUMERIC(12,2) DEFAULT 58500000, -- K/0
  ptkp_k_1 NUMERIC(12,2) DEFAULT 63000000, -- K/1
  ptkp_k_2 NUMERIC(12,2) DEFAULT 67500000, -- K/2
  ptkp_k_3 NUMERIC(12,2) DEFAULT 72000000, -- K/3
  
  -- THR configuration
  thr_eligible_months INTEGER DEFAULT 12, -- Minimal kerja untuk THR penuh
  thr_prorate BOOLEAN DEFAULT TRUE,
  
  -- Payroll schedule
  payroll_day INTEGER DEFAULT 25, -- Tanggal gajian (25 setiap bulan)
  overtime_multiplier NUMERIC(5,2) DEFAULT 1.5, -- 1.5x untuk overtime
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO payroll_settings (company_name) 
VALUES ('Arkiv OS')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. EMPLOYEE SALARY (Salary structure per karyawan)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_salary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Fixed components
  base_salary NUMERIC(12,2) NOT NULL, -- Gaji pokok
  fixed_allowance NUMERIC(12,2) DEFAULT 0, -- Tunjangan tetap
  
  -- Variable components (monthly)
  variable_allowance NUMERIC(12,2) DEFAULT 0, -- Tunjangan tidak tetap
  transport_allowance NUMERIC(12,2) DEFAULT 0, -- Tunjangan transportasi
  meal_allowance NUMERIC(12,2) DEFAULT 0, -- Tunjangan makan
  housing_allowance NUMERIC(12,2) DEFAULT 0, -- Tunjangan perumahan
  
  -- Deductions
  loan_deduction NUMERIC(12,2) DEFAULT 0, -- Cicilan pinjaman
  other_deduction NUMERIC(12,2) DEFAULT 0, -- Potongan lain
  
  -- Tax status
  ptkp_status TEXT DEFAULT 'TK/0', -- Status PTKP (TK/0, K/1, dll)
  is_taxable BOOLEAN DEFAULT TRUE,
  
  -- BPJS enrollment
  bpjs_tk_enrolled BOOLEAN DEFAULT TRUE,
  bpjs_kes_enrolled BOOLEAN DEFAULT TRUE,
  tapera_enrolled BOOLEAN DEFAULT TRUE,
  
  -- Effective date
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_employee_salary UNIQUE (employee_id, effective_date)
);

CREATE INDEX idx_employee_salary_employee ON employee_salary(employee_id);
CREATE INDEX idx_employee_salary_active ON employee_salary(is_active);

-- ============================================================
-- 3. PAYROLL RUNS (Monthly payroll processing)
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_name TEXT NOT NULL, -- e.g., "Payroll Mei 2026"
  period_month INTEGER NOT NULL, -- 1-12
  period_year INTEGER NOT NULL, -- 2026
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, processing, completed, paid, cancelled
  processed_by UUID REFERENCES employees(id),
  processed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Summary
  total_employees INTEGER DEFAULT 0,
  total_gross NUMERIC(14,2) DEFAULT 0,
  total_deductions NUMERIC(14,2) DEFAULT 0,
  total_net NUMERIC(14,2) DEFAULT 0,
  total_bjtk_employee NUMERIC(14,2) DEFAULT 0,
  total_bjtk_employer NUMERIC(14,2) DEFAULT 0,
  total_pph21 NUMERIC(14,2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_period UNIQUE (period_month, period_year)
);

CREATE INDEX idx_payroll_runs_period ON payroll_runs(period_year, period_month);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status);

-- ============================================================
-- 4. PAYROLL DETAILS (Per-karyawan detail dalam satu run)
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  
  -- Earnings (Pemasukan)
  base_salary NUMERIC(12,2) DEFAULT 0,
  fixed_allowance NUMERIC(12,2) DEFAULT 0,
  variable_allowance NUMERIC(12,2) DEFAULT 0,
  transport_allowance NUMERIC(12,2) DEFAULT 0,
  meal_allowance NUMERIC(12,2) DEFAULT 0,
  housing_allowance NUMERIC(12,2) DEFAULT 0,
  overtime_pay NUMERIC(12,2) DEFAULT 0,
  thr NUMERIC(12,2) DEFAULT 0,
  bonus NUMERIC(12,2) DEFAULT 0,
  other_earning NUMERIC(12,2) DEFAULT 0,
  
  -- Deductions (Potongan)
  bpjs_tk_jht_deduction NUMERIC(12,2) DEFAULT 0, -- 2%
  bpjs_tk_jp_deduction NUMERIC(12,2) DEFAULT 0, -- 1%
  bpjs_kes_deduction NUMERIC(12,2) DEFAULT 0, -- 1%
  tapera_deduction NUMERIC(12,2) DEFAULT 0, -- 2.5%
  pph21_deduction NUMERIC(12,2) DEFAULT 0,
  loan_deduction NUMERIC(12,2) DEFAULT 0,
  unpaid_leave_deduction NUMERIC(12,2) DEFAULT 0,
  other_deduction NUMERIC(12,2) DEFAULT 0,
  
  -- Totals
  gross_salary NUMERIC(12,2) DEFAULT 0, -- Total pemasukan
  total_deductions NUMERIC(12,2) DEFAULT 0, -- Total potongan
  net_salary NUMERIC(12,2) DEFAULT 0, -- Take home pay
  
  -- Attendance integration
  working_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  late_days INTEGER DEFAULT 0,
  unpaid_leave_days INTEGER DEFAULT 0,
  overtime_hours NUMERIC(6,2) DEFAULT 0,
  
  -- BPJS employer contribution
  bpjs_tk_jht_employer NUMERIC(12,2) DEFAULT 0,
  bpjs_tk_jp_employer NUMERIC(12,2) DEFAULT 0,
  bpjs_tk_jkk_employer NUMERIC(12,2) DEFAULT 0,
  bpjs_tk_jkm_employer NUMERIC(12,2) DEFAULT 0,
  bpjs_kes_employer NUMERIC(12,2) DEFAULT 0,
  tapera_employer NUMERIC(12,2) DEFAULT 0,
  
  -- Tax calculation details
  taxable_income NUMERIC(12,2) DEFAULT 0, -- Penghasilan bruto setahun
  ptkp_amount NUMERIC(12,2) DEFAULT 0, -- PTKP tahunan
  pph21_annual NUMERIC(12,2) DEFAULT 0, -- PPh 21 tahunan
  pph21_monthly NUMERIC(12,2) DEFAULT 0, -- PPh 21 bulanan
  
  -- Status
  status TEXT DEFAULT 'calculated', -- calculated, approved, paid
  payslip_sent BOOLEAN DEFAULT FALSE,
  payslip_sent_at TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payroll_details_run ON payroll_details(payroll_run_id);
CREATE INDEX idx_payroll_details_employee ON payroll_details(employee_id);

-- ============================================================
-- 5. BENEFITS (Company benefits catalog)
-- ============================================================

CREATE TABLE IF NOT EXISTS benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g., "Asuransi Kesehatan Swasta", "Gym Membership"
  type TEXT NOT NULL, -- insurance, wellness, pension, other
  description TEXT,
  
  -- Coverage
  coverage_amount NUMERIC(12,2), -- Nilai pertanggungan
  coverage_percentage NUMERIC(5,2), -- Persentase coverage
  
  -- Cost sharing
  employee_contribution NUMERIC(5,2) DEFAULT 0, -- % ditanggung karyawan
  employer_contribution NUMERIC(5,2) DEFAULT 100, -- % ditanggung perusahaan
  
  -- Eligibility
  min_tenure_months INTEGER DEFAULT 0, -- Minimal masa kerja
  eligible_employment_status TEXT[], -- ['permanent', 'contract']
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_benefits_active ON benefits(is_active);

-- ============================================================
-- 6. EMPLOYEE BENEFITS (Enrollment per karyawan)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  
  -- Enrollment
  enrolled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Coverage details
  coverage_amount NUMERIC(12,2),
  policy_number TEXT,
  
  -- Cost
  employee_cost NUMERIC(12,2) DEFAULT 0,
  employer_cost NUMERIC(12,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active', -- active, pending, terminated
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_employee_benefit UNIQUE (employee_id, benefit_id)
);

CREATE INDEX idx_employee_benefits_employee ON employee_benefits(employee_id);
CREATE INDEX idx_employee_benefits_active ON employee_benefits(is_active);

-- ============================================================
-- 7. LOANS (Employee loans & salary advances)
-- ============================================================

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Loan details
  loan_type TEXT NOT NULL, -- salary_advance, personal_loan, emergency_loan
  principal_amount NUMERIC(12,2) NOT NULL, -- Pokok pinjaman
  interest_rate NUMERIC(5,2) DEFAULT 0, -- Bunga per tahun (%)
  tenor_months INTEGER NOT NULL, -- Jangka waktu (bulan)
  
  -- Approval
  requested_date TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES employees(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Disbursement
  disbursed_at TIMESTAMPTZ,
  disbursed_amount NUMERIC(12,2),
  
  -- Repayment
  monthly_installment NUMERIC(12,2) DEFAULT 0,
  first_installment_month INTEGER,
  first_installment_year INTEGER,
  remaining_balance NUMERIC(12,2),
  paid_amount NUMERIC(12,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, disbursed, paid_off, defaulted
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Notes
  purpose TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loans_employee ON loans(employee_id);
CREATE INDEX idx_loans_status ON loans(status);

-- ============================================================
-- 8. PAYROLL TAX CONFIG (PPh 21 configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year INTEGER NOT NULL UNIQUE,
  
  -- PTKP values
  ptkp_tk_0 NUMERIC(12,2) DEFAULT 54000000,
  ptkp_tk_1 NUMERIC(12,2) DEFAULT 58500000,
  ptkp_tk_2 NUMERIC(12,2) DEFAULT 63000000,
  ptkp_tk_3 NUMERIC(12,2) DEFAULT 67500000,
  ptkp_k_0 NUMERIC(12,2) DEFAULT 58500000,
  ptkp_k_1 NUMERIC(12,2) DEFAULT 63000000,
  ptkp_k_2 NUMERIC(12,2) DEFAULT 67500000,
  ptkp_k_3 NUMERIC(12,2) DEFAULT 72000000,
  
  -- PPh 21 brackets
  bracket_1_limit NUMERIC(12,2) DEFAULT 60000000,
  bracket_1_rate NUMERIC(5,2) DEFAULT 5.00,
  bracket_2_limit NUMERIC(12,2) DEFAULT 250000000,
  bracket_2_rate NUMERIC(5,2) DEFAULT 15.00,
  bracket_3_limit NUMERIC(12,2) DEFAULT 500000000,
  bracket_3_rate NUMERIC(5,2) DEFAULT 25.00,
  bracket_4_limit NUMERIC(12,2) DEFAULT 5000000000,
  bracket_4_rate NUMERIC(5,2) DEFAULT 30.00,
  bracket_5_rate NUMERIC(5,2) DEFAULT 35.00,
  
  -- Other config
  jabatan_expense_percentage NUMERIC(5,2) DEFAULT 5.00, -- Biaya jabatan 5%
  jabatan_expense_max NUMERIC(12,2) DEFAULT 6000000, -- Max 6jt per tahun
  pension_deduction_percentage NUMERIC(5,2) DEFAULT 0, -- Iuran pensiun (jika ada)
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tax config for 2026
INSERT INTO payroll_tax_config (tax_year) VALUES (2026)
ON CONFLICT (tax_year) DO NOTHING;

-- ============================================================
-- 9. HELPER FUNCTIONS
-- ============================================================

-- Function: Calculate PPh 21 ETR (progressive tax)
CREATE OR REPLACE FUNCTION calculate_pph21_etr(
  annual_taxable_income NUMERIC,
  ptkp_status TEXT DEFAULT 'TK/0'
) RETURNS NUMERIC AS $$
DECLARE
  ptkp_amount NUMERIC := 0;
  taxable_income NUMERIC;
  tax_amount NUMERIC := 0;
  remaining NUMERIC;
BEGIN
  -- Get PTKP based on status
  SELECT 
    CASE ptkp_status
      WHEN 'TK/0' THEN ptkp_tk_0
      WHEN 'TK/1' THEN ptkp_tk_1
      WHEN 'TK/2' THEN ptkp_tk_2
      WHEN 'TK/3' THEN ptkp_tk_3
      WHEN 'K/0' THEN ptkp_k_0
      WHEN 'K/1' THEN ptkp_k_1
      WHEN 'K/2' THEN ptkp_k_2
      WHEN 'K/3' THEN ptkp_k_3
      ELSE ptkp_tk_0
    END INTO ptkp_amount
  FROM payroll_tax_config
  WHERE tax_year = EXTRACT(YEAR FROM CURRENT_DATE)
  LIMIT 1;
  
  -- Calculate taxable income
  taxable_income := GREATEST(0, annual_taxable_income - ptkp_amount);
  
  -- Progressive tax calculation (ETR method)
  remaining := taxable_income;
  
  -- Bracket 1: 0-60jt @ 5%
  IF remaining > 0 THEN
    tax_amount := tax_amount + LEAST(remaining, 60000000) * 0.05;
    remaining := remaining - 60000000;
  END IF;
  
  -- Bracket 2: 60-250jt @ 15%
  IF remaining > 0 THEN
    tax_amount := tax_amount + LEAST(remaining, 190000000) * 0.15;
    remaining := remaining - 190000000;
  END IF;
  
  -- Bracket 3: 250-500jt @ 25%
  IF remaining > 0 THEN
    tax_amount := tax_amount + LEAST(remaining, 250000000) * 0.25;
    remaining := remaining - 250000000;
  END IF;
  
  -- Bracket 4: 500jt-5M @ 30%
  IF remaining > 0 THEN
    tax_amount := tax_amount + LEAST(remaining, 4500000000) * 0.30;
    remaining := remaining - 4500000000;
  END IF;
  
  -- Bracket 5: >5M @ 35%
  IF remaining > 0 THEN
    tax_amount := tax_amount + remaining * 0.35;
  END IF;
  
  RETURN ROUND(tax_amount, 0);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate BPJS deductions
CREATE OR REPLACE FUNCTION calculate_bpjs_deductions(
  monthly_salary NUMERIC,
  bpjs_tk_enrolled BOOLEAN DEFAULT TRUE,
  bpjs_kes_enrolled BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  bpjs_tk_jht NUMERIC,
  bpjs_tk_jp NUMERIC,
  bpjs_kes NUMERIC,
  total_employee NUMERIC,
  bpjs_tk_jht_employer NUMERIC,
  bpjs_tk_jp_employer NUMERIC,
  bpjs_tk_jkk_employer NUMERIC,
  bpjs_tk_jkm_employer NUMERIC,
  bpjs_kes_employer NUMERIC,
  total_employer NUMERIC
) AS $$
DECLARE
  bpjs_tk_max NUMERIC := 10414000; -- UMP 2026 cap for BPJS TK
  bpjs_kes_max NUMERIC := 12000000; -- Cap for BPJS Kesehatan
  calc_salary_tk NUMERIC;
  calc_salary_kes NUMERIC;
BEGIN
  -- Cap salary for BPJS calculation
  calc_salary_tk := LEAST(monthly_salary, bpjs_tk_max);
  calc_salary_kes := LEAST(monthly_salary, bpjs_kes_max);
  
  -- Employee deductions
  bpjs_tk_jht := CASE WHEN bpjs_tk_enrolled THEN calc_salary_tk * 0.02 ELSE 0 END;
  bpjs_tk_jp := CASE WHEN bpjs_tk_enrolled AND monthly_salary >= 5000000 THEN calc_salary_tk * 0.01 ELSE 0 END;
  bpjs_kes := CASE WHEN bpjs_kes_enrolled THEN calc_salary_kes * 0.01 ELSE 0 END;
  total_employee := bpjs_tk_jht + bpjs_tk_jp + bpjs_kes;
  
  -- Employer contributions
  bpjs_tk_jht_employer := CASE WHEN bpjs_tk_enrolled THEN calc_salary_tk * 0.037 ELSE 0 END;
  bpjs_tk_jp_employer := CASE WHEN bpjs_tk_enrolled THEN calc_salary_tk * 0.02 ELSE 0 END;
  bpjs_tk_jkk_employer := CASE WHEN bpjs_tk_enrolled THEN calc_salary_tk * 0.0024 ELSE 0 END;
  bpjs_tk_jkm_employer := CASE WHEN bpjs_tk_enrolled THEN calc_salary_tk * 0.003 ELSE 0 END;
  bpjs_kes_employer := CASE WHEN bpjs_kes_enrolled THEN calc_salary_kes * 0.04 ELSE 0 END;
  total_employer := bpjs_tk_jht_employer + bpjs_tk_jp_employer + bpjs_tk_jkk_employer + bpjs_tk_jkm_employer + bpjs_kes_employer;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. RLS POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_tax_config ENABLE ROW LEVEL SECURITY;

-- Payroll Settings: HRD and Finance only
CREATE POLICY "HRD and Finance can view payroll settings"
ON payroll_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

-- Employee Salary: Own salary + HRD/Finance can view all
CREATE POLICY "Employees can view own salary"
ON employee_salary FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

CREATE POLICY "HRD and Finance can manage salary"
ON employee_salary FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

-- Payroll Runs: HRD/Finance only
CREATE POLICY "HRD and Finance can view payroll runs"
ON payroll_runs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

CREATE POLICY "HRD and Finance can manage payroll runs"
ON payroll_runs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

-- Payroll Details: Own detail + HRD/Finance can view all
CREATE POLICY "Employees can view own payroll details"
ON payroll_details FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

CREATE POLICY "HRD and Finance can manage payroll details"
ON payroll_details FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

-- Benefits: All authenticated can view active benefits
CREATE POLICY "All authenticated can view active benefits"
ON benefits FOR SELECT
TO authenticated
USING (is_active = TRUE);

CREATE POLICY "HRD and Finance can manage benefits"
ON benefits FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

-- Employee Benefits: Own benefits + HRD can manage
CREATE POLICY "Employees can view own benefits"
ON employee_benefits FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

CREATE POLICY "HRD and Finance can manage employee benefits"
ON employee_benefits FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

-- Loans: Own loans + HRD/Finance can view all
CREATE POLICY "Employees can view own loans"
ON loans FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

CREATE POLICY "Employees can create own loans"
ON loans FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "HRD and Finance can manage loans"
ON loans FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

-- Payroll Tax Config: HRD/Finance only
CREATE POLICY "HRD and Finance can view tax config"
ON payroll_tax_config FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

CREATE POLICY "HRD and Finance can manage tax config"
ON payroll_tax_config FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM positions p WHERE p.id = e.job_title_id
      AND (p.title ILIKE '%HRD%' OR p.title ILIKE '%Finance%' OR p.title ILIKE '%HR%')
    )
  )
);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE payroll_settings IS 'Company-wide payroll configuration including BPJS rates, PTKP, and PPh 21 brackets';
COMMENT ON TABLE employee_salary IS 'Salary structure per employee with fixed and variable components';
COMMENT ON TABLE payroll_runs IS 'Monthly payroll processing runs';
COMMENT ON TABLE payroll_details IS 'Per-employee payroll calculation details within a run';
COMMENT ON TABLE benefits IS 'Company benefits catalog (insurance, wellness, pension)';
COMMENT ON TABLE employee_benefits IS 'Employee enrollment in company benefits';
COMMENT ON TABLE loans IS 'Employee loans and salary advances';
COMMENT ON TABLE payroll_tax_config IS 'Annual PPh 21 ETR configuration including PTKP and tax brackets';
COMMENT ON FUNCTION calculate_pph21_etr IS 'Calculate PPh 21 using ETR (Effective Tax Rate) progressive method';
COMMENT ON FUNCTION calculate_bpjs_deductions IS 'Calculate BPJS Ketenagakerjaan and Kesehatan deductions';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
