-- =============================================================================
-- ARKIV OS — COMPLETE DATABASE SCHEMA (FINAL STATE)
-- Generated: 2026-06-22
-- This file is idempotent. Run on a fresh Postgres/Supabase instance to
-- recreate the full schema. Do NOT replay individual migrations.
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. CUSTOM TYPES / ENUMS
-- =============================================================================

-- HRIS attendance and leave types
DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present','absent','late','half_day','wfh','sick','permission','holiday');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM ('annual','sick','emergency','maternity','paternity','marriage','bereavement','unpaid','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE onboarding_category AS ENUM ('administrative','it_setup','workspace','team_introduction','training','orientation','compliance','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resignation_type AS ENUM ('voluntary','involuntary','retirement','end_of_contract','mutual_agreement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offboarding_status AS ENUM ('pending','in_progress','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM ('morning','afternoon','night','split','flexible');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- POS types
DO $$ BEGIN
  CREATE TYPE pos_order_status AS ENUM ('pending','confirmed','preparing','ready','served','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pos_payment_method AS ENUM ('cash','qris','debit','credit','ark_coin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pos_payment_status AS ENUM ('unpaid','partial','paid','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pos_order_type AS ENUM ('dine_in','takeaway','delivery','self_order');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pos_employee_role AS ENUM ('pos_admin','pos_manager','pos_cashier','pos_kitchen','pos_server');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pos_split_status AS ENUM ('pending','paid','partial','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- 3. HELPER FUNCTIONS (RLS, Utilities)
-- =============================================================================

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- RLS helper: get current user's role from public.users
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- RLS helper: get current user's brand_id
CREATE OR REPLACE FUNCTION public.get_user_brand()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT brand_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- RLS helper: check if current user is HRD
CREATE OR REPLACE FUNCTION public.is_hrd()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'hrd');
$$;

-- RLS helper: check if current user is manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('hrd','hiring_manager','direksi'));
$$;

-- RLS helper: get current employee id
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS helper: get current user's brand id (from employees)
CREATE OR REPLACE FUNCTION public.current_user_brand_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT brand_id FROM public.employees WHERE user_id = auth.uid() LIMIT 1;
$$;

-- =============================================================================
-- 4. CORE TABLES (Users, Auth, Recruitment, Gamification)
-- =============================================================================

-- Brands (tenants)
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (application users, linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'hrd' CHECK (role IN (
    'super_admin','admin','hrd','hiring_manager','direksi',
    'purchasing_admin','purchasing_manager','purchasing_staff',
    'finance_staff','warehouse_staff','warehouse_admin',
    'pos','pos_supervisor','qc_staff'
  )),
  full_name TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "HRD can view all users" ON public.users;
CREATE POLICY "HRD can view all users" ON public.users
  FOR SELECT USING (public.get_user_role() = 'hrd');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- User approval permissions
CREATE TABLE IF NOT EXISTS public.user_approval_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  workflow TEXT NOT NULL,
  approval_level TEXT NOT NULL CHECK (approval_level IN ('checker','approver','final_approver')),
  approval_limit NUMERIC(14,2) CHECK (approval_limit IS NULL OR approval_limit >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_approval_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_user_approval_permissions" ON public.user_approval_permissions;
CREATE POLICY "service_role_manage_user_approval_permissions" ON public.user_approval_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own_approval_permissions" ON public.user_approval_permissions;
CREATE POLICY "users_read_own_approval_permissions" ON public.user_approval_permissions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Admin audit logs
CREATE TABLE IF NOT EXISTS public.admin_user_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_user_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_admin_user_audit_logs" ON public.admin_user_audit_logs;
CREATE POLICY "service_role_manage_admin_user_audit_logs" ON public.admin_user_audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Job openings
CREATE TABLE IF NOT EXISTS public.job_openings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  requirements TEXT,
  location VARCHAR(100),
  employment_type VARCHAR(50) DEFAULT 'full_time',
  salary_min NUMERIC(15,2),
  salary_max NUMERIC(15,2),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','closed','archived')),
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD manages job openings" ON public.job_openings;
CREATE POLICY "HRD manages job openings" ON public.job_openings
  FOR ALL USING (public.get_user_role() IN ('hrd','hiring_manager','direksi'));

DROP POLICY IF EXISTS "Public can view published openings" ON public.job_openings;
CREATE POLICY "Public can view published openings" ON public.job_openings
  FOR SELECT USING (status = 'published');

-- Trigger: set published_at when job_openings status becomes published
CREATE OR REPLACE FUNCTION public.fn_job_opening_published_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND (OLD.status IS DISTINCT FROM 'published') THEN
    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_opening_published_at ON public.job_openings;
CREATE TRIGGER trg_job_opening_published_at
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.fn_job_opening_published_at();

-- Candidates
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  job_opening_id UUID REFERENCES public.job_openings(id) ON DELETE SET NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  resume_url TEXT,
  cover_letter TEXT,
  status VARCHAR(30) DEFAULT 'applied' CHECK (status IN ('applied','screening','interview','offered','hired','rejected','withdrawn')),
  source VARCHAR(50),
  notes TEXT,
  tags TEXT[],
  last_contacted_at TIMESTAMPTZ,
  last_experience TEXT,
  last_education TEXT,
  availability VARCHAR(100),
  expected_salary NUMERIC(15,2),
  promoted_to_employee_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage candidates" ON public.candidates;
CREATE POLICY "HRD can manage candidates" ON public.candidates
  FOR ALL USING (public.get_user_role() IN ('hrd','hiring_manager','direksi'));

-- Interviews
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  interview_type VARCHAR(50) DEFAULT 'in_person',
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage interviews" ON public.interviews;
CREATE POLICY "HRD can manage interviews" ON public.interviews
  FOR ALL USING (public.get_user_role() IN ('hrd','hiring_manager','direksi'));

-- Notifications log (system-level)
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications_log;
CREATE POLICY "Users can view own notifications" ON public.notifications_log
  FOR SELECT USING (user_id = auth.uid());

-- Notifications (in-app)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own in-app notifications" ON public.notifications;
CREATE POLICY "Users can view own in-app notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Gamification: user XP stats
CREATE TABLE IF NOT EXISTS public.user_xp_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  level_name VARCHAR(50) DEFAULT 'Beginner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gamification: XP activities
CREATE TABLE IF NOT EXISTS public.xp_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gamification: badges
CREATE TABLE IF NOT EXISTS public.xp_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  xp_required INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.xp_badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

-- Gamification: challenges
CREATE TABLE IF NOT EXISTS public.xp_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  xp_reward INTEGER DEFAULT 0,
  target_count INTEGER DEFAULT 1,
  challenge_type VARCHAR(50),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.xp_challenges(id) ON DELETE CASCADE,
  current_count INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  UNIQUE (user_id, challenge_id)
);

-- Gamification: rewards and redemptions
CREATE TABLE IF NOT EXISTS public.xp_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  xp_cost INTEGER NOT NULL DEFAULT 0,
  stock INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.xp_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES public.xp_rewards(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','fulfilled')),
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. HRIS TABLES
-- =============================================================================

-- Employment statuses lookup
CREATE TABLE IF NOT EXISTS public.employment_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.employment_statuses (code, label) VALUES
  ('permanent','Karyawan Tetap'),
  ('contract','Karyawan Kontrak'),
  ('probation','Masa Percobaan'),
  ('part_time','Paruh Waktu'),
  ('internship','Magang'),
  ('freelance','Freelance')
ON CONFLICT (code) DO NOTHING;

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  head_employee_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage departments" ON public.departments;
CREATE POLICY "HRD can manage departments" ON public.departments
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "All authenticated users can view departments" ON public.departments;
CREATE POLICY "All authenticated users can view departments" ON public.departments
  FOR SELECT TO authenticated USING (true);

-- Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  nip VARCHAR(20) UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  employment_status VARCHAR(50) DEFAULT 'permanent',
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  salary NUMERIC(15,2),
  bank_name VARCHAR(50),
  bank_account_number VARCHAR(50),
  bank_account_name VARCHAR(100),
  address TEXT,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage employees" ON public.employees;
CREATE POLICY "HRD can manage employees" ON public.employees
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Managers can view employees in their brand" ON public.employees;
CREATE POLICY "Managers can view employees in their brand" ON public.employees
  FOR SELECT USING (
    brand_id = public.current_user_brand_id()
    AND public.is_manager()
  );

-- Generate NIP function
CREATE OR REPLACE FUNCTION public.generate_nip(p_brand_id UUID, p_join_date DATE)
RETURNS VARCHAR LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT := TO_CHAR(p_join_date, 'YYYY');
  v_month TEXT := TO_CHAR(p_join_date, 'MM');
  v_seq INTEGER;
  v_brand_prefix TEXT;
BEGIN
  SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3))
  INTO v_brand_prefix
  FROM public.brands WHERE id = p_brand_id;

  v_brand_prefix := COALESCE(v_brand_prefix, 'ARK');

  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.employees
  WHERE brand_id = p_brand_id
    AND TO_CHAR(join_date, 'YYYY-MM') = v_year || '-' || v_month;

  RETURN v_brand_prefix || '-' || v_year || v_month || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_employee_nip()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nip IS NULL AND NEW.brand_id IS NOT NULL THEN
    NEW.nip := public.generate_nip(NEW.brand_id, COALESCE(NEW.join_date, CURRENT_DATE));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_employee_nip ON public.employees;
CREATE TRIGGER trg_set_employee_nip
  BEFORE INSERT ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.set_employee_nip();

-- Promote candidate to employee function
CREATE OR REPLACE FUNCTION public.promote_candidate_to_employee(
  p_candidate_id UUID,
  p_brand_id UUID,
  p_department_id UUID,
  p_position_id UUID,
  p_join_date DATE DEFAULT CURRENT_DATE,
  p_salary NUMERIC DEFAULT NULL,
  p_employment_status VARCHAR DEFAULT 'permanent'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_candidate RECORD;
  v_employee_id UUID;
BEGIN
  SELECT * INTO v_candidate FROM public.candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found: %', p_candidate_id;
  END IF;

  INSERT INTO public.employees (
    brand_id, department_id, position_id, candidate_id,
    full_name, email, phone,
    employment_status, join_date, salary
  ) VALUES (
    p_brand_id, p_department_id, p_position_id, p_candidate_id,
    v_candidate.full_name, v_candidate.email, v_candidate.phone,
    p_employment_status, p_join_date, p_salary
  ) RETURNING id INTO v_employee_id;

  UPDATE public.candidates
  SET status = 'hired', promoted_to_employee_id = v_employee_id
  WHERE id = p_candidate_id;

  RETURN v_employee_id;
END;
$$;

-- Sections (organizational sub-units)
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff (simplified reference for POS/shift)
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  role VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage staff" ON public.staff;
CREATE POLICY "HRD can manage staff" ON public.staff
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "Authenticated users can view staff" ON public.staff;
CREATE POLICY "Authenticated users can view staff" ON public.staff
  FOR SELECT TO authenticated USING (true);

-- Staff schedules
CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff sections (junction)
CREATE TABLE IF NOT EXISTS public.staff_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, section_id)
);

-- Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  work_hours NUMERIC(5,2),
  overtime_hours NUMERIC(5,2) DEFAULT 0,
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage attendance" ON public.attendance;
CREATE POLICY "HRD can manage attendance" ON public.attendance
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "Employees can view own attendance" ON public.attendance;
CREATE POLICY "Employees can view own attendance" ON public.attendance
  FOR SELECT USING (employee_id = public.current_employee_id());

-- Calculate work hours function
CREATE OR REPLACE FUNCTION public.calculate_work_hours()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.check_in IS NOT NULL AND NEW.check_out IS NOT NULL THEN
    NEW.work_hours := ROUND(EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 3600.0, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_work_hours ON public.attendance;
CREATE TRIGGER trg_calculate_work_hours
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.calculate_work_hours();

-- Leaves
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  leave_type leave_type NOT NULL,
  status leave_status NOT NULL DEFAULT 'pending',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,2),
  reason TEXT,
  attachment_url TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leaves_date_check CHECK (end_date >= start_date)
);

ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage leaves" ON public.leaves;
CREATE POLICY "HRD can manage leaves" ON public.leaves
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "Employees can manage own leaves" ON public.leaves;
CREATE POLICY "Employees can manage own leaves" ON public.leaves
  FOR ALL USING (employee_id = public.current_employee_id());

-- Calculate leave days function
CREATE OR REPLACE FUNCTION public.calculate_leave_days()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    NEW.total_days := (NEW.end_date - NEW.start_date) + 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_leave_days ON public.leaves;
CREATE TRIGGER trg_calculate_leave_days
  BEFORE INSERT OR UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.calculate_leave_days();

-- Leave balances
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  annual_leave_total NUMERIC(5,2) DEFAULT 12,
  annual_leave_used NUMERIC(5,2) DEFAULT 0,
  annual_leave_remaining NUMERIC(5,2) GENERATED ALWAYS AS (annual_leave_total - annual_leave_used) STORED,
  sick_leave_used NUMERIC(5,2) DEFAULT 0,
  emergency_leave_used NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage leave balances" ON public.leave_balances;
CREATE POLICY "HRD can manage leave balances" ON public.leave_balances
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "Employees can view own leave balances" ON public.leave_balances;
CREATE POLICY "Employees can view own leave balances" ON public.leave_balances
  FOR SELECT USING (employee_id = public.current_employee_id());

-- Onboarding checklists
CREATE TABLE IF NOT EXISTS public.onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category onboarding_category NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage onboarding checklists" ON public.onboarding_checklists;
CREATE POLICY "HRD can manage onboarding checklists" ON public.onboarding_checklists
  FOR ALL USING (public.is_hrd());

-- Offboarding checklists
CREATE TABLE IF NOT EXISTS public.offboarding_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  resignation_type resignation_type DEFAULT 'voluntary',
  offboarding_status offboarding_status DEFAULT 'pending',
  resignation_date DATE,
  last_working_date DATE,
  title VARCHAR(200),
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.offboarding_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage offboarding checklists" ON public.offboarding_checklists;
CREATE POLICY "HRD can manage offboarding checklists" ON public.offboarding_checklists
  FOR ALL USING (public.is_hrd());

-- Employee schedules
CREATE TABLE IF NOT EXISTS public.employee_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  shift_type shift_type DEFAULT 'morning',
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage employee schedules" ON public.employee_schedules;
CREATE POLICY "HRD can manage employee schedules" ON public.employee_schedules
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "Employees can view own schedule" ON public.employee_schedules;
CREATE POLICY "Employees can view own schedule" ON public.employee_schedules
  FOR SELECT USING (employee_id = public.current_employee_id());

-- =============================================================================
-- 6. PAYROLL / BENEFITS TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  pay_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (pay_cycle IN ('weekly','bi_weekly','monthly')),
  pay_day INTEGER DEFAULT 25 CHECK (pay_day BETWEEN 1 AND 31),
  overtime_rate NUMERIC(5,2) DEFAULT 1.5,
  bpjs_kesehatan_employee_pct NUMERIC(5,2) DEFAULT 1.0,
  bpjs_kesehatan_employer_pct NUMERIC(5,2) DEFAULT 4.0,
  bpjs_tk_jht_employee_pct NUMERIC(5,2) DEFAULT 2.0,
  bpjs_tk_jht_employer_pct NUMERIC(5,2) DEFAULT 3.7,
  bpjs_tk_jkk_employer_pct NUMERIC(5,2) DEFAULT 0.24,
  bpjs_tk_jkm_employer_pct NUMERIC(5,2) DEFAULT 0.3,
  tapera_employee_pct NUMERIC(5,2) DEFAULT 2.5,
  tapera_employer_pct NUMERIC(5,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage payroll settings" ON public.payroll_settings;
CREATE POLICY "HRD can manage payroll settings" ON public.payroll_settings
  FOR ALL USING (public.is_hrd());

CREATE TABLE IF NOT EXISTS public.employee_salary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  basic_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  position_allowance NUMERIC(15,2) DEFAULT 0,
  transport_allowance NUMERIC(15,2) DEFAULT 0,
  meal_allowance NUMERIC(15,2) DEFAULT 0,
  other_allowance NUMERIC(15,2) DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employee_salary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage salaries" ON public.employee_salary;
CREATE POLICY "HRD can manage salaries" ON public.employee_salary
  FOR ALL USING (public.is_hrd());

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','processing','approved','paid','cancelled')),
  total_gross NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  total_net NUMERIC(15,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, period_year, period_month)
);

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage payroll runs" ON public.payroll_runs;
CREATE POLICY "HRD can manage payroll runs" ON public.payroll_runs
  FOR ALL USING (public.is_hrd());

CREATE TABLE IF NOT EXISTS public.payroll_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  basic_salary NUMERIC(15,2) DEFAULT 0,
  total_allowances NUMERIC(15,2) DEFAULT 0,
  gross_salary NUMERIC(15,2) DEFAULT 0,
  bpjs_kesehatan_employee NUMERIC(15,2) DEFAULT 0,
  bpjs_kesehatan_employer NUMERIC(15,2) DEFAULT 0,
  bpjs_tk_jht_employee NUMERIC(15,2) DEFAULT 0,
  bpjs_tk_jht_employer NUMERIC(15,2) DEFAULT 0,
  bpjs_tk_jkk_employer NUMERIC(15,2) DEFAULT 0,
  bpjs_tk_jkm_employer NUMERIC(15,2) DEFAULT 0,
  tapera_employee NUMERIC(15,2) DEFAULT 0,
  tapera_employer NUMERIC(15,2) DEFAULT 0,
  pph21 NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  net_salary NUMERIC(15,2) DEFAULT 0,
  overtime_pay NUMERIC(15,2) DEFAULT 0,
  bonus NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payroll_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage payroll details" ON public.payroll_details;
CREATE POLICY "HRD can manage payroll details" ON public.payroll_details
  FOR ALL USING (public.is_hrd());

CREATE TABLE IF NOT EXISTS public.benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  value NUMERIC(15,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  value_override NUMERIC(15,2),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  monthly_deduction NUMERIC(15,2) NOT NULL,
  remaining_balance NUMERIC(15,2),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending','active','completed','cancelled')),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_tax_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  tax_year INTEGER NOT NULL,
  ptkp_tk0 NUMERIC(15,2) DEFAULT 54000000,
  ptkp_k0 NUMERIC(15,2) DEFAULT 58500000,
  ptkp_k1 NUMERIC(15,2) DEFAULT 63000000,
  ptkp_k2 NUMERIC(15,2) DEFAULT 67500000,
  ptkp_k3 NUMERIC(15,2) DEFAULT 72000000,
  tier1_rate NUMERIC(5,2) DEFAULT 5,
  tier1_limit NUMERIC(15,2) DEFAULT 60000000,
  tier2_rate NUMERIC(5,2) DEFAULT 15,
  tier2_limit NUMERIC(15,2) DEFAULT 250000000,
  tier3_rate NUMERIC(5,2) DEFAULT 25,
  tier3_limit NUMERIC(15,2) DEFAULT 500000000,
  tier4_rate NUMERIC(5,2) DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, tax_year)
);

-- =============================================================================
-- 7. PURCHASING & INVENTORY TABLES
-- =============================================================================

-- Units of measurement
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(10) UNIQUE NOT NULL,
  nama VARCHAR(50) NOT NULL,
  deskripsi TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage units" ON public.units;
CREATE POLICY "Authenticated users can manage units" ON public.units
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Raw materials (ingredients)
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  kategori VARCHAR(30) NOT NULL CHECK (kategori IN ('BAHAN_PANGAN','BAHAN_NON_PANGAN','KEMASAN','BAHAN_BAKAR','LAINNYA')),
  deskripsi TEXT,
  satuan_besar_id UUID REFERENCES public.units(id),
  satuan_kecil_id UUID REFERENCES public.units(id),
  konversi_factor DECIMAL(10,4) DEFAULT 1,
  stok_minimum DECIMAL(12,4) DEFAULT 0,
  stok_maximum DECIMAL(12,4) DEFAULT 0,
  shelf_life_days INTEGER,
  storage_condition VARCHAR(20) CHECK (storage_condition IN ('SUHU_RUANG','DINGIN','BEKU','KHUSUS')),
  material_type VARCHAR(20) DEFAULT 'PURCHASED' CHECK (material_type IN ('PURCHASED','WIP','FINISHED')),
  source_product_id UUID,
  coa_production VARCHAR(50),
  coa_rnd VARCHAR(50),
  coa_asset VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage raw_materials" ON public.raw_materials;
CREATE POLICY "Authenticated users can manage raw_materials" ON public.raw_materials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(20) UNIQUE NOT NULL,
  nama_supplier VARCHAR(100) NOT NULL,
  pic_name VARCHAR(100),
  pic_phone VARCHAR(20),
  email VARCHAR(100),
  alamat TEXT,
  kota VARCHAR(50),
  npwp VARCHAR(20),
  payment_terms INTEGER DEFAULT 30,
  currency VARCHAR(3) DEFAULT 'IDR',
  bank_name VARCHAR(50),
  bank_account_number VARCHAR(50),
  bank_account_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers;
CREATE POLICY "Authenticated users can manage suppliers" ON public.suppliers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products (finished menu/retail items)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  kategori VARCHAR(50),
  satuan_id UUID REFERENCES public.units(id),
  harga_jual DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
CREATE POLICY "Authenticated users can manage products" ON public.products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bill of Materials items
CREATE TABLE IF NOT EXISTS public.bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  qty_required DECIMAL(12,4) NOT NULL,
  satuan_id UUID REFERENCES public.units(id),
  waste_factor DECIMAL(5,4) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, raw_material_id)
);

-- Supplier price lists (canonical)
CREATE TABLE IF NOT EXISTS public.supplier_price_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  satuan_id UUID REFERENCES public.units(id),
  harga DECIMAL(15,2) NOT NULL,
  min_qty DECIMAL(12,4) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (supplier_id, raw_material_id)
);

ALTER TABLE public.supplier_price_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage supplier price list" ON public.supplier_price_list;
CREATE POLICY "Authenticated users can manage supplier price list" ON public.supplier_price_list
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Raw material unit conversions
CREATE TABLE IF NOT EXISTS public.raw_material_unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  satuan_id UUID NOT NULL REFERENCES public.units(id),
  qty_in_base_unit NUMERIC NOT NULL CHECK (qty_in_base_unit > 0),
  is_base BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  UNIQUE (raw_material_id, satuan_id)
);

ALTER TABLE public.raw_material_unit_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.raw_material_unit_conversions;
CREATE POLICY "Allow all" ON public.raw_material_unit_conversions
  FOR ALL USING (true) WITH CHECK (true);

-- Purchase requisitions
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_pr VARCHAR(30) UNIQUE NOT NULL,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','partially_ordered','ordered','cancelled')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage PRs" ON public.purchase_requisitions;
CREATE POLICY "Authenticated users can manage PRs" ON public.purchase_requisitions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PR items
CREATE TABLE IF NOT EXISTS public.pr_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
  raw_material_id UUID REFERENCES public.raw_materials(id),
  satuan_id UUID REFERENCES public.units(id),
  qty_requested NUMERIC(12,4) NOT NULL,
  qty_approved NUMERIC(12,4),
  qty_ordered NUMERIC(12,4) DEFAULT 0,
  estimated_price NUMERIC(15,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_po VARCHAR(30) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  pr_id UUID REFERENCES public.purchase_requisitions(id) ON DELETE SET NULL,
  production_order_id UUID,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','partially_received','received','cancelled')),
  tanggal_po DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_kirim_estimasi DATE,
  tanggal_kirim_aktual DATE,
  subtotal NUMERIC(15,2) DEFAULT 0,
  diskon_nominal NUMERIC(15,2) DEFAULT 0,
  ppn_persen NUMERIC(5,2) DEFAULT 0,
  ppn_nominal NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  shipping_address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Authenticated users can manage purchase orders" ON public.purchase_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Purchase order items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  pr_item_id UUID REFERENCES public.pr_items(id) ON DELETE SET NULL,
  raw_material_id UUID REFERENCES public.raw_materials(id),
  satuan_id UUID REFERENCES public.units(id),
  qty_ordered NUMERIC(12,4) NOT NULL,
  qty_received NUMERIC(12,4) DEFAULT 0,
  harga_satuan NUMERIC(15,2) DEFAULT 0,
  subtotal NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GRN (Goods Receipt Note) header
CREATE TABLE IF NOT EXISTS public.grn (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_grn VARCHAR(30) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','received','partial','rejected','cancelled')),
  tanggal_terima DATE NOT NULL DEFAULT CURRENT_DATE,
  receive_count INTEGER DEFAULT 1,
  notes TEXT,
  received_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.grn ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage GRN" ON public.grn;
CREATE POLICY "Authenticated users can manage GRN" ON public.grn
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- GRN items
CREATE TABLE IF NOT EXISTS public.grn_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES public.grn(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES public.purchase_order_items(id) ON DELETE SET NULL,
  raw_material_id UUID REFERENCES public.raw_materials(id),
  satuan_id UUID REFERENCES public.units(id),
  qty_ordered NUMERIC(12,4) DEFAULT 0,
  qty_diterima NUMERIC(12,4) NOT NULL DEFAULT 0,
  qty_rejected NUMERIC(12,4) DEFAULT 0,
  qty_returned NUMERIC(12,4) DEFAULT 0,
  harga_satuan NUMERIC(15,2) DEFAULT 0,
  subtotal NUMERIC(15,2) DEFAULT 0,
  batch_number VARCHAR(50),
  expiry_date DATE,
  qc_status VARCHAR(20) DEFAULT 'pending' CHECK (qc_status IN ('pending','passed','failed','partial')),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QC inspections
CREATE TABLE IF NOT EXISTS public.qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID REFERENCES public.grn(id) ON DELETE CASCADE,
  grn_item_id UUID REFERENCES public.grn_items(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','passed','failed','partial')),
  score NUMERIC(5,2),
  notes TEXT,
  inspected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliveries (outbound)
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_delivery VARCHAR(30),
  no_surat_jalan VARCHAR(50),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','shipped','delivered','cancelled')),
  tanggal_kirim DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase returns
CREATE TABLE IF NOT EXISTS public.purchase_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_return VARCHAR(30) UNIQUE NOT NULL,
  grn_id UUID REFERENCES public.grn(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','processed','rejected','cancelled')),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(15,2) DEFAULT 0,
  reason TEXT,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  grn_item_id UUID REFERENCES public.grn_items(id) ON DELETE SET NULL,
  raw_material_id UUID REFERENCES public.raw_materials(id),
  satuan_id UUID REFERENCES public.units(id),
  qty_returned NUMERIC(12,4) NOT NULL,
  harga_satuan NUMERIC(15,2) DEFAULT 0,
  subtotal NUMERIC(15,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase order payment terms
CREATE TABLE IF NOT EXISTS public.purchase_order_payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  term_no INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  due_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','overdue','cancelled')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purchase_order_id, term_no)
);

-- Vendor payments
CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  payment_term_id UUID REFERENCES public.purchase_order_payment_terms(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (method IN ('cash','bank_transfer','giro','qris','other')),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','void')),
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COGS additional costs
CREATE TABLE IF NOT EXISTS public.cogs_additional_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  type VARCHAR(50),
  amount NUMERIC(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id UUID UNIQUE NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  qty_available NUMERIC(12,4) DEFAULT 0,
  qty_on_order NUMERIC(12,4) DEFAULT 0,
  qty_minimum NUMERIC DEFAULT 1000,
  qty_maximum NUMERIC(12,4) DEFAULT 0,
  unit_cost NUMERIC(15,2) DEFAULT 0,
  lokasi_rak VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.inventory;
CREATE POLICY "Authenticated users can manage inventory" ON public.inventory
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inventory movements
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN','OUT','ADJUSTMENT','CONVERSION','RETURN')),
  qty NUMERIC(12,4) NOT NULL,
  unit_cost NUMERIC(15,2),
  reference_type VARCHAR(50),
  reference_id UUID,
  return_id UUID REFERENCES public.purchase_returns(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage inventory movements" ON public.inventory_movements;
CREATE POLICY "Authenticated users can manage inventory movements" ON public.inventory_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- 8. PRODUCTION TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_produksi VARCHAR(30) UNIQUE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  qty_planned NUMERIC(12,4) NOT NULL,
  qty_produced NUMERIC(12,4) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','cancelled')),
  planned_start DATE,
  planned_end DATE,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage production orders" ON public.production_orders;
CREATE POLICY "Authenticated users can manage production orders" ON public.production_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.production_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  satuan_id UUID REFERENCES public.units(id),
  qty_planned NUMERIC(12,4) NOT NULL,
  qty_actual NUMERIC(12,4) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  qty_produced NUMERIC(12,4) DEFAULT 0,
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finished_goods_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  production_batch_id UUID REFERENCES public.production_batches(id) ON DELETE SET NULL,
  qty_available NUMERIC(12,4) DEFAULT 0,
  unit_cost NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from raw_materials.source_product_id now that products exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'raw_materials_source_product_id_fkey'
  ) THEN
    ALTER TABLE public.raw_materials
      ADD CONSTRAINT raw_materials_source_product_id_fkey
      FOREIGN KEY (source_product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add FK from purchase_orders.production_order_id now that production_orders exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_production_order_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_orders
      ADD CONSTRAINT purchase_orders_production_order_id_fkey
      FOREIGN KEY (production_order_id) REFERENCES public.production_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 9. POS TABLES
-- =============================================================================

-- POS categories
CREATE TABLE IF NOT EXISTS public.pos_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES public.pos_categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS products (menu items)
CREATE TABLE IF NOT EXISTS public.pos_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.pos_categories(id),
  base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  xp_points INTEGER DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  service_charge_rate DECIMAL(5,2) DEFAULT 0,
  image_url TEXT,
  prep_time_minutes INTEGER DEFAULT 0,
  station TEXT NOT NULL DEFAULT 'kitchen' CHECK (station IN ('kitchen','bar','bakery','dessert','merchandise','photobooth')),
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  inventory_tracking BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS product variants
CREATE TABLE IF NOT EXISTS public.pos_product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.pos_products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  group_name VARCHAR(50) NOT NULL,
  price_adjustment DECIMAL(12,2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS modifier groups
CREATE TABLE IF NOT EXISTS public.pos_modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  min_selection INTEGER DEFAULT 0,
  max_selection INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS modifiers
CREATE TABLE IF NOT EXISTS public.pos_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.pos_modifier_groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price_adjustment DECIMAL(12,2) DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product-modifier relationship
CREATE TABLE IF NOT EXISTS public.pos_product_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.pos_products(id) ON DELETE CASCADE,
  modifier_group_id UUID REFERENCES public.pos_modifier_groups(id) ON DELETE CASCADE,
  UNIQUE (product_id, modifier_group_id)
);

-- POS recipes (product -> raw material)
CREATE TABLE IF NOT EXISTS public.pos_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.pos_products(id) ON DELETE CASCADE,
  raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE RESTRICT,
  quantity_per_unit DECIMAL(12,4) NOT NULL,
  unit_of_measure VARCHAR(20) NOT NULL,
  waste_percentage DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, raw_material_id)
);

-- POS customers (CRM)
CREATE TABLE IF NOT EXISTS public.pos_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(100),
  membership_tier VARCHAR(20) DEFAULT 'bronze',
  total_xp INTEGER DEFAULT 0,
  current_xp INTEGER DEFAULT 0,
  ark_coin_balance DECIMAL(12,2) DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS shifts (cashier shifts)
CREATE TABLE IF NOT EXISTS public.pos_shifts (
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

ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_shifts_select_all" ON public.pos_shifts;
CREATE POLICY "pos_shifts_select_all" ON public.pos_shifts FOR SELECT USING (true);

DROP POLICY IF EXISTS "pos_shifts_insert_all" ON public.pos_shifts;
CREATE POLICY "pos_shifts_insert_all" ON public.pos_shifts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "pos_shifts_update_all" ON public.pos_shifts;
CREATE POLICY "pos_shifts_update_all" ON public.pos_shifts FOR UPDATE USING (true);

-- POS tables (restaurant table management)
CREATE TABLE IF NOT EXISTS public.pos_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL,
  name TEXT,
  capacity INTEGER NOT NULL DEFAULT 4,
  area TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  qr_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pos_tables ENABLE ROW LEVEL SECURITY;

-- POS orders
CREATE TABLE IF NOT EXISTS public.pos_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  order_type pos_order_type NOT NULL DEFAULT 'dine_in',
  status pos_order_status NOT NULL DEFAULT 'pending',
  payment_status pos_payment_status NOT NULL DEFAULT 'unpaid',
  payment_method pos_payment_method,
  customer_id UUID REFERENCES public.pos_customers(id),
  cashier_id UUID NOT NULL,
  server_id UUID,
  shift_id UUID REFERENCES public.pos_shifts(id) ON DELETE SET NULL,
  table_id TEXT,
  branch_id UUID,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_reason VARCHAR(200),
  tax_amount DECIMAL(12,2) DEFAULT 0,
  service_charge_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,
  change_amount DECIMAL(12,2) DEFAULT 0,
  ark_coins_used DECIMAL(12,2) DEFAULT 0,
  ark_coins_earned INTEGER DEFAULT 0,
  notes TEXT,
  special_requests TEXT,
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason VARCHAR(200),
  served_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS order items
CREATE TABLE IF NOT EXISTS public.pos_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.pos_products(id),
  product_name VARCHAR(200) NOT NULL,
  product_sku VARCHAR(50) NOT NULL,
  variants JSONB DEFAULT '[]'::jsonb,
  modifiers JSONB DEFAULT '[]'::jsonb,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  cost_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_margin_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  inventory_deducted BOOLEAN DEFAULT FALSE,
  kitchen_status TEXT NOT NULL DEFAULT 'pending' CHECK (kitchen_status IN ('pending','preparing','ready','served','cancelled')),
  kitchen_notes TEXT,
  kitchen_started_at TIMESTAMPTZ,
  kitchen_ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  station TEXT CHECK (station IN ('kitchen','bar','bakery','dessert','merchandise','photobooth')),
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS order status history
CREATE TABLE IF NOT EXISTS public.pos_order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS wallet transactions
CREATE TABLE IF NOT EXISTS public.pos_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.pos_customers(id),
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  ark_coins DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  payment_method pos_payment_method,
  xendit_transaction_id VARCHAR(100),
  order_id UUID REFERENCES public.pos_orders(id),
  reference_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS XP transactions
CREATE TABLE IF NOT EXISTS public.pos_xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.pos_customers(id),
  order_id UUID REFERENCES public.pos_orders(id),
  xp_earned INTEGER DEFAULT 0,
  xp_redeemed INTEGER DEFAULT 0,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS vouchers
CREATE TABLE IF NOT EXISTS public.pos_vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  min_purchase DECIMAL(12,2) DEFAULT 0,
  max_discount DECIMAL(12,2),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_customer_limit INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- POS order splits
CREATE TABLE IF NOT EXISTS public.pos_order_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  split_index INTEGER NOT NULL,
  label TEXT DEFAULT '',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash','qris','debit','credit','ark_coin')),
  status pos_split_status NOT NULL DEFAULT 'pending',
  customer_id UUID REFERENCES public.pos_customers(id),
  ark_coins_used NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  UNIQUE (order_id, split_index)
);

ALTER TABLE public.pos_order_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.pos_order_splits;
CREATE POLICY "Allow all" ON public.pos_order_splits FOR ALL USING (true) WITH CHECK (true);

-- POS order split items
CREATE TABLE IF NOT EXISTS public.pos_order_split_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES public.pos_order_splits(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.pos_order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE (split_id, order_item_id)
);

ALTER TABLE public.pos_order_split_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.pos_order_split_items;
CREATE POLICY "Allow all" ON public.pos_order_split_items FOR ALL USING (true) WITH CHECK (true);

-- POS split payments
CREATE TABLE IF NOT EXISTS public.pos_split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES public.pos_order_splits(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  reference_number TEXT,
  cashier_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pos_split_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.pos_split_payments;
CREATE POLICY "Allow all" ON public.pos_split_payments FOR ALL USING (true) WITH CHECK (true);

-- POS print jobs
CREATE TABLE IF NOT EXISTS public.pos_print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  station TEXT NOT NULL DEFAULT 'kitchen' CHECK (station IN ('kitchen','bar','bakery','dessert','merchandise','photobooth')),
  job_type TEXT NOT NULL DEFAULT 'kitchen_ticket' CHECK (job_type IN ('kitchen_ticket','bar_ticket','customer_receipt','void_ticket')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','printing','printed','failed','cancelled')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KDS station mappings
CREATE TABLE IF NOT EXISTS public.pos_kds_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_kds_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.pos_order_items(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.pos_kds_stations(id),
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cooking_time_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 10. CRM / LOYALTY TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.crm_membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  min_xp INTEGER NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  cashback_pct NUMERIC(5,2) DEFAULT 0,
  ark_coin_multiplier NUMERIC(5,2) DEFAULT 1.0,
  priority_service BOOLEAN DEFAULT FALSE,
  free_delivery BOOLEAN DEFAULT FALSE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_collectible_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url TEXT,
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
  unlock_condition TEXT,
  xp_cost INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_customer_id UUID UNIQUE REFERENCES public.pos_customers(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.crm_membership_tiers(id) ON DELETE SET NULL,
  display_name VARCHAR(100),
  avatar_id UUID REFERENCES public.crm_collectible_avatars(id) ON DELETE SET NULL,
  bio TEXT,
  total_lifetime_xp INTEGER DEFAULT 0,
  current_xp INTEGER DEFAULT 0,
  ark_coin_balance NUMERIC(12,2) DEFAULT 0,
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES public.crm_member_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crm_member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage CRM profiles" ON public.crm_member_profiles;
CREATE POLICY "Authenticated users can manage CRM profiles" ON public.crm_member_profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.crm_xp_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  xp_amount INTEGER NOT NULL DEFAULT 0,
  multiplier NUMERIC(5,2) DEFAULT 1.0,
  conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.crm_member_profiles(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.crm_xp_rules(id) ON DELETE SET NULL,
  xp_amount INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL CHECK (type IN ('discount','free_item','cashback','ark_coin','voucher','experience')),
  value NUMERIC(12,2) DEFAULT 0,
  xp_cost INTEGER NOT NULL DEFAULT 0,
  stock INTEGER,
  min_tier_id UUID REFERENCES public.crm_membership_tiers(id) ON DELETE SET NULL,
  valid_days INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.crm_member_profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.crm_rewards(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','active','used','expired','cancelled')),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.crm_member_avatar_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.crm_member_profiles(id) ON DELETE CASCADE,
  avatar_id UUID NOT NULL REFERENCES public.crm_collectible_avatars(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, avatar_id)
);

CREATE TABLE IF NOT EXISTS public.crm_integration_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),
  api_endpoint TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.crm_integration_partners(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.crm_member_profiles(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed CRM tiers
INSERT INTO public.crm_membership_tiers (name, min_xp, discount_pct, cashback_pct, ark_coin_multiplier) VALUES
  ('Bronze', 0, 0, 0, 1.0),
  ('Silver', 1000, 5, 2, 1.5),
  ('Gold', 5000, 10, 5, 2.0),
  ('Platinum', 20000, 15, 8, 3.0)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 11. KPI / PERFORMANCE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kpi_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  measurement_unit VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kpi_template_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.kpi_templates(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.positions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','approved')),
  overall_score NUMERIC(5,2),
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage performance reviews" ON public.performance_reviews;
CREATE POLICY "HRD can manage performance reviews" ON public.performance_reviews
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "Employees can view own reviews" ON public.performance_reviews;
CREATE POLICY "Employees can view own reviews" ON public.performance_reviews
  FOR SELECT USING (employee_id = public.current_employee_id());

CREATE TABLE IF NOT EXISTS public.employee_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.performance_reviews(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.kpi_templates(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  target_value NUMERIC(15,2),
  target_text TEXT,
  actual_value NUMERIC(15,2),
  weight NUMERIC(5,2) DEFAULT 100,
  score NUMERIC(5,2),
  period_start DATE,
  period_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kpi_progress_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kpi_id UUID NOT NULL REFERENCES public.employee_kpis(id) ON DELETE CASCADE,
  value NUMERIC(15,2) NOT NULL,
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.behavioral_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  competency VARCHAR(100) NOT NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.behavioral_review_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  behavioral_standard_id UUID,
  behavior_description TEXT,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kpi_template_behavioral (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.kpi_templates(id) ON DELETE CASCADE,
  behavior_description TEXT NOT NULL,
  weight NUMERIC(5,2) DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.development_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.performance_reviews(id) ON DELETE SET NULL,
  goal TEXT NOT NULL,
  actions TEXT,
  target_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  project_name VARCHAR(200) NOT NULL,
  role VARCHAR(100),
  start_date DATE,
  end_date DATE,
  contribution_pct NUMERIC(5,2) DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.behavioral_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  competency VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  description TEXT NOT NULL,
  examples TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.score_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  score INTEGER UNIQUE NOT NULL,
  label VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.score_scales (score, label, description) VALUES
  (1, 'Below Expectations', 'Performance does not meet minimum requirements'),
  (2, 'Needs Improvement', 'Performance partially meets requirements'),
  (3, 'Meets Expectations', 'Performance fully meets requirements'),
  (4, 'Exceeds Expectations', 'Performance consistently exceeds requirements'),
  (5, 'Outstanding', 'Performance is exceptional in all areas')
ON CONFLICT (score) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.performance_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HRIS Logbook tables
CREATE TABLE IF NOT EXISTS public.hris_logbook_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hris_logbook_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.hris_logbook_templates(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  max_score NUMERIC(5,2) DEFAULT 100,
  weight NUMERIC(5,2) DEFAULT 100,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hris_logbook_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.hris_logbook_templates(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_score NUMERIC(5,2),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved')),
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hris_logbook_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HRD can manage logbook entries" ON public.hris_logbook_entries;
CREATE POLICY "HRD can manage logbook entries" ON public.hris_logbook_entries
  FOR ALL USING (public.is_hrd());

DROP POLICY IF EXISTS "Employees can manage own logbook entries" ON public.hris_logbook_entries;
CREATE POLICY "Employees can manage own logbook entries" ON public.hris_logbook_entries
  FOR ALL USING (employee_id = public.current_employee_id());

CREATE TABLE IF NOT EXISTS public.hris_logbook_entry_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES public.hris_logbook_entries(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES public.hris_logbook_template_items(id) ON DELETE RESTRICT,
  score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 12. NOTIFICATIONS & AI ASSISTANT TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_assistant_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  prompt TEXT NOT NULL,
  response TEXT,
  model VARCHAR(100),
  tokens_used INTEGER,
  duration_ms INTEGER,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_assistant_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI logs" ON public.ai_assistant_logs;
CREATE POLICY "Users can view own AI logs" ON public.ai_assistant_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages AI logs" ON public.ai_assistant_logs;
CREATE POLICY "Service role manages AI logs" ON public.ai_assistant_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.ai_assistant_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(200),
  context_module VARCHAR(50),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_assistant_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own AI sessions" ON public.ai_assistant_sessions;
CREATE POLICY "Users can manage own AI sessions" ON public.ai_assistant_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ai_assistant_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.ai_assistant_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_assistant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own AI messages" ON public.ai_assistant_messages;
CREATE POLICY "Users can manage own AI messages" ON public.ai_assistant_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ai_assistant_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 13. VIEWS
-- =============================================================================

-- Raw materials stock view (final state)
CREATE OR REPLACE VIEW public.v_raw_materials_stock AS
SELECT
    rm.id,
    rm.kode,
    rm.nama,
    rm.kategori,
    rm.deskripsi,
    rm.satuan_besar_id,
    rm.satuan_kecil_id,
    rm.konversi_factor,
    rm.stok_minimum,
    rm.stok_maximum,
    rm.shelf_life_days,
    rm.storage_condition,
    rm.is_active,
    rm.created_at,
    rm.updated_at,
    rm.created_by,
    rm.updated_by,
    u1.nama AS satuan_besar_nama,
    u2.nama AS satuan_kecil_nama,
    COALESCE(i.qty_available, 0) AS qty_onhand,
    0 AS qty_reserved,
    COALESCE(i.qty_on_order, 0) AS qty_on_order,
    COALESCE(i.unit_cost, 0) AS avg_cost,
    CASE
        WHEN COALESCE(i.qty_available, 0) <= 0 THEN 'HABIS'
        WHEN COALESCE(i.qty_available, 0) <= COALESCE(i.qty_minimum, rm.stok_minimum, 0) THEN 'MENIPIS'
        ELSE 'AMAN'
    END AS status_stok,
    COALESCE(rm.material_type, 'PURCHASED') AS material_type,
    rm.source_product_id,
    rm.deleted_at,
    rm.deleted_by,
    u1.nama AS satuan,
    COALESCE(i.lokasi_rak, '-') AS lokasi_rak,
    COALESCE(i.qty_minimum, rm.stok_minimum, 0) AS min_stock,
    COALESCE(i.qty_maximum, rm.stok_maximum) AS max_stock,
    COALESCE(i.unit_cost, 0) AS unit_cost,
    (COALESCE(i.qty_available, 0) * COALESCE(i.unit_cost, 0)) AS total_value
FROM public.raw_materials rm
LEFT JOIN public.units u1 ON rm.satuan_besar_id = u1.id
LEFT JOIN public.units u2 ON rm.satuan_kecil_id = u2.id
LEFT JOIN public.inventory i ON rm.id = i.raw_material_id AND i.is_active = TRUE
WHERE rm.deleted_at IS NULL;

-- Products COGS view
CREATE OR REPLACE VIEW public.v_products_cogs AS
SELECT
    p.id,
    p.kode,
    p.nama,
    p.deskripsi,
    p.kategori,
    p.satuan_id,
    p.harga_jual,
    p.is_active,
    p.created_at,
    p.updated_at,
    p.created_by,
    p.updated_by,
    p.deleted_at,
    p.deleted_by,
    u.nama AS satuan_nama,
    COALESCE(bom.total_bahan, 0) AS total_bahan_baku,
    COALESCE(bom.estimated_cogs, 0) AS estimated_cogs,
    COALESCE(bom.estimated_cogs, 0) AS hpp_estimasi
FROM public.products p
LEFT JOIN public.units u ON p.satuan_id = u.id
LEFT JOIN (
    SELECT
        bi.product_id,
        COUNT(*) AS total_bahan,
        SUM(bi.qty_required * (1 + COALESCE(bi.waste_factor, 0)) * COALESCE(i.unit_cost, 0)) AS estimated_cogs
    FROM public.bom_items bi
    LEFT JOIN public.raw_materials rm ON bi.raw_material_id = rm.id
    LEFT JOIN public.inventory i ON rm.id = i.raw_material_id
    WHERE bi.is_active = TRUE
    GROUP BY bi.product_id
) bom ON p.id = bom.product_id
WHERE p.deleted_at IS NULL;

-- Supplier price history view
CREATE OR REPLACE VIEW public.v_supplier_price_history AS
SELECT
    spl.id,
    spl.supplier_id,
    s.nama_supplier,
    spl.raw_material_id,
    rm.kode AS material_kode,
    rm.nama AS material_nama,
    spl.satuan_id,
    u.nama AS satuan_nama,
    spl.harga,
    spl.min_qty,
    spl.lead_time_days,
    spl.valid_from,
    spl.valid_to,
    spl.is_active,
    spl.created_at
FROM public.supplier_price_list spl
LEFT JOIN public.suppliers s ON s.id = spl.supplier_id
LEFT JOIN public.raw_materials rm ON rm.id = spl.raw_material_id
LEFT JOIN public.units u ON u.id = spl.satuan_id;

-- Purchase orders view (FINAL - from 20260525084308)
CREATE OR REPLACE VIEW public.v_purchase_orders AS
SELECT
    po.*,
    production.nomor_produksi AS production_order_number,
    s.nama_supplier,
    s.kode AS supplier_kode,
    s.pic_name AS supplier_pic,
    s.email AS supplier_email,
    COALESCE(item_stats.total_items, 0) AS total_items,
    COALESCE(item_stats.total_items, 0) AS item_count,
    COALESCE(item_stats.total_qty, 0) AS total_qty,
    COALESCE(item_stats.total_qty, 0) AS total_qty_ordered,
    COALESCE(item_stats.received_qty, 0) AS total_qty_received,
    COALESCE(item_stats.total_value, 0) AS total_value,
    COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) AS calculated_subtotal,
    COALESCE(
      NULLIF(po.ppn_nominal, 0),
      ROUND((COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) - COALESCE(po.diskon_nominal, 0)) * COALESCE(po.ppn_persen, 0) / 100, 2),
      0
    ) AS calculated_ppn_nominal,
    payable.payable_amount AS grand_total,
    COALESCE(item_stats.received_items, 0) AS received_items,
    receive.receiving_progress_pct AS progress_pct,
    receive.receiving_progress_pct AS receive_percentage,
    receive.receiving_progress_pct AS received_percentage,
    COALESCE(payment.term_count, 0) AS payment_term_count,
    payable.payable_amount AS payable_amount,
    COALESCE(payment.paid_amount, 0) AS paid_amount,
    GREATEST(payable.payable_amount - COALESCE(payment.paid_amount, 0), 0) AS outstanding_amount,
    payment.next_due_date,
    CASE
      WHEN payable.payable_amount <= 0 THEN 100
      ELSE LEAST(100, ROUND((COALESCE(payment.paid_amount, 0)::numeric / payable.payable_amount::numeric) * 100, 2))
    END AS payment_progress_pct,
    CASE
      WHEN receive.receiving_progress_pct >= 100 THEN 'received'
      WHEN receive.receiving_progress_pct > 0 THEN 'partial'
      ELSE 'not_received'
    END AS receiving_status,
    CASE
      WHEN payable.payable_amount <= 0 THEN 'paid'
      WHEN COALESCE(payment.paid_amount, 0) >= payable.payable_amount THEN 'paid'
      WHEN COALESCE(payment.paid_amount, 0) > 0 THEN 'partial'
      WHEN payment.next_due_date IS NOT NULL AND payment.next_due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'unpaid'
    END AS payment_status,
    CASE
      WHEN po.status = 'cancelled' THEN 'cancelled'
      WHEN po.status = 'draft' THEN 'draft'
      WHEN receive.receiving_progress_pct >= 100
        AND (payable.payable_amount <= 0 OR COALESCE(payment.paid_amount, 0) >= payable.payable_amount)
        THEN 'completed'
      WHEN receive.receiving_progress_pct >= 100 THEN 'waiting_payment'
      WHEN payable.payable_amount > 0 AND COALESCE(payment.paid_amount, 0) >= payable.payable_amount THEN 'waiting_receipt'
      ELSE 'in_progress'
    END AS lifecycle_status,
    ROUND((
      receive.receiving_progress_pct
      + CASE
          WHEN payable.payable_amount <= 0 THEN 100
          ELSE LEAST(100, ROUND((COALESCE(payment.paid_amount, 0)::numeric / payable.payable_amount::numeric) * 100, 2))
        END
    ) / 2, 2) AS overall_progress_pct
FROM public.purchase_orders po
LEFT JOIN public.production_orders production ON production.id = po.production_order_id
LEFT JOIN public.suppliers s ON s.id = po.supplier_id
LEFT JOIN (
    SELECT
        purchase_order_id,
        COUNT(*) AS total_items,
        COALESCE(SUM(qty_ordered), 0) AS total_qty,
        COALESCE(SUM(subtotal), 0) AS total_value,
        COALESCE(SUM(CASE WHEN qty_received >= qty_ordered THEN 1 ELSE 0 END), 0) AS received_items,
        COALESCE(SUM(qty_received), 0) AS received_qty
    FROM public.purchase_order_items
    WHERE is_active = TRUE
    GROUP BY purchase_order_id
) item_stats ON item_stats.purchase_order_id = po.id
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100, 2)
    END AS receiving_progress_pct
) receive
CROSS JOIN LATERAL (
  SELECT COALESCE(
    NULLIF(po.total, 0),
    COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0)
      - COALESCE(po.diskon_nominal, 0)
      + COALESCE(NULLIF(po.ppn_nominal, 0), ROUND((COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) - COALESCE(po.diskon_nominal, 0)) * COALESCE(po.ppn_persen, 0) / 100, 2), 0),
    0
  ) AS payable_amount
) payable
LEFT JOIN (
  SELECT
    purchase_order_id,
    COUNT(*) AS term_count,
    SUM(amount) AS scheduled_amount,
    SUM(paid_amount) AS paid_amount,
    MIN(due_date) FILTER (WHERE status IN ('unpaid', 'partial', 'overdue') AND is_active = TRUE) AS next_due_date
  FROM public.purchase_order_payment_terms
  WHERE is_active = TRUE
  GROUP BY purchase_order_id
) payment ON payment.purchase_order_id = po.id
WHERE po.is_active = TRUE;

-- Purchase order payments view
CREATE OR REPLACE VIEW public.v_purchase_order_payments AS
SELECT
  po.id AS purchase_order_id,
  po.nomor_po,
  po.supplier_id,
  s.nama_supplier,
  payable.payable_amount,
  COALESCE(term_stats.term_amount, 0) AS scheduled_amount,
  COALESCE(term_stats.paid_amount, 0) AS paid_amount,
  GREATEST(payable.payable_amount - COALESCE(term_stats.paid_amount, 0), 0) AS outstanding_amount,
  term_stats.next_due_date,
  CASE
    WHEN payable.payable_amount <= 0 THEN 'paid'
    WHEN COALESCE(term_stats.paid_amount, 0) >= payable.payable_amount THEN 'paid'
    WHEN COALESCE(term_stats.paid_amount, 0) > 0 THEN 'partial'
    WHEN term_stats.next_due_date IS NOT NULL AND term_stats.next_due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'unpaid'
  END AS payment_status,
  COALESCE(term_stats.term_count, 0) AS term_count,
  CASE
    WHEN payable.payable_amount <= 0 THEN 100
    ELSE LEAST(100, ROUND((COALESCE(term_stats.paid_amount, 0)::numeric / payable.payable_amount::numeric) * 100, 2))
  END AS payment_progress_pct
FROM public.purchase_orders po
LEFT JOIN public.suppliers s ON s.id = po.supplier_id
CROSS JOIN LATERAL (
  SELECT COALESCE(NULLIF(po.total, 0), po.subtotal - COALESCE(po.diskon_nominal, 0) + COALESCE(po.ppn_nominal, 0), 0) AS payable_amount
) payable
LEFT JOIN (
  SELECT
    purchase_order_id,
    COUNT(*) AS term_count,
    SUM(amount) AS term_amount,
    SUM(paid_amount) AS paid_amount,
    MIN(due_date) FILTER (WHERE status IN ('unpaid', 'partial', 'overdue') AND is_active = TRUE) AS next_due_date
  FROM public.purchase_order_payment_terms
  WHERE is_active = TRUE
  GROUP BY purchase_order_id
) term_stats ON term_stats.purchase_order_id = po.id
WHERE po.is_active = TRUE;

-- Production orders view
CREATE OR REPLACE VIEW public.v_production_orders AS
SELECT
    po.*,
    p.nama AS product_name,
    p.kode AS product_kode,
    u.nama AS satuan_nama,
    COALESCE(po.qty_produced, 0) AS qty_produced_safe,
    CASE
        WHEN po.qty_planned = 0 THEN 0
        ELSE ROUND((COALESCE(po.qty_produced, 0) / po.qty_planned) * 100, 2)
    END AS completion_pct
FROM public.production_orders po
LEFT JOIN public.products p ON p.id = po.product_id
LEFT JOIN public.units u ON u.id = p.satuan_id
WHERE po.is_active = TRUE;

-- Finished goods stock view
CREATE OR REPLACE VIEW public.v_finished_goods_stock AS
SELECT
    p.id AS product_id,
    p.kode,
    p.nama,
    p.kategori,
    COALESCE(SUM(fg.qty_available), 0) AS qty_available,
    COALESCE(AVG(fg.unit_cost), 0) AS avg_unit_cost,
    COALESCE(SUM(fg.qty_available * fg.unit_cost), 0) AS total_value
FROM public.products p
LEFT JOIN public.finished_goods_inventory fg ON fg.product_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.kode, p.nama, p.kategori;

-- =============================================================================
-- 14. FUNCTIONS & RPCs
-- =============================================================================

-- Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

-- Get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::INTEGER FROM public.notifications
  WHERE user_id = auth.uid() AND is_read = FALSE;
$$;

-- Recalculate PO payment term
CREATE OR REPLACE FUNCTION public.recalculate_purchase_order_payment_term(p_term_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_amount NUMERIC(15,2);
  v_paid NUMERIC(15,2);
  v_due DATE;
BEGIN
  IF p_term_id IS NULL THEN RETURN; END IF;

  SELECT amount, due_date INTO v_amount, v_due
  FROM public.purchase_order_payment_terms
  WHERE id = p_term_id AND is_active = TRUE;

  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM public.vendor_payments
  WHERE payment_term_id = p_term_id AND status = 'posted';

  UPDATE public.purchase_order_payment_terms
  SET paid_amount = v_paid,
      status = CASE
        WHEN v_paid >= v_amount THEN 'paid'
        WHEN v_paid > 0 THEN 'partial'
        WHEN v_due < CURRENT_DATE THEN 'overdue'
        ELSE 'unpaid'
      END,
      updated_at = NOW()
  WHERE id = p_term_id;
END;
$$;

-- Generate shift number
CREATE OR REPLACE FUNCTION public.generate_shift_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_date TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
  v_count INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(shift_number FROM 13 FOR 4) AS INTEGER)), 0)
  INTO v_count
  FROM public.pos_shifts
  WHERE shift_number LIKE 'SHF-' || v_date || '-%';
  RETURN 'SHF-' || v_date || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
END;
$$;

-- Update POS shift totals (trigger function)
CREATE OR REPLACE FUNCTION public.pos_update_shift_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
  IF v_shift_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('completed','served') AND NEW.payment_status NOT IN ('paid','partial') THEN RETURN NEW; END IF;

  SELECT
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount_paid ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'debit' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(ark_coins_used), 0)
  INTO v_total_orders, v_total_sales, v_total_cash, v_total_qris, v_total_debit, v_total_credit, v_total_ark
  FROM public.pos_orders
  WHERE shift_id = v_shift_id;

  SELECT COALESCE(opening_cash, 0) + v_total_cash INTO v_expected
  FROM public.pos_shifts WHERE id = v_shift_id;

  UPDATE public.pos_shifts SET
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
$$;

-- Pay split transaction RPC (final version with 'partial' status)
CREATE OR REPLACE FUNCTION public.pos_pay_split_transaction(
  p_split_id UUID,
  p_payment_method TEXT,
  p_amount_paid NUMERIC,
  p_ark_coins_used NUMERIC DEFAULT 0,
  p_cashier_id TEXT DEFAULT 'system',
  p_reference_number TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_split_record RECORD;
  v_order_id UUID;
  v_customer_id UUID;
  v_cust_balance NUMERIC(12,2);
  v_change NUMERIC(12,2);
  v_all_paid_count INTEGER;
  v_total_splits INTEGER;
BEGIN
  SELECT s.* INTO v_split_record FROM public.pos_order_splits s WHERE s.id = p_split_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Split not found'); END IF;
  IF v_split_record.status = 'cancelled' THEN RETURN jsonb_build_object('success', false, 'error', 'Split already cancelled'); END IF;
  IF v_split_record.status = 'paid' THEN RETURN jsonb_build_object('success', false, 'error', 'Split already paid'); END IF;

  v_order_id := v_split_record.order_id;
  IF p_amount_paid < v_split_record.total_amount THEN
    RETURN jsonb_build_object('success', false, 'error', format('Amount paid %.0f is less than split total %.0f', p_amount_paid, v_split_record.total_amount));
  END IF;

  v_change := p_amount_paid - v_split_record.total_amount;
  v_customer_id := v_split_record.customer_id;

  IF p_ark_coins_used > 0 THEN
    IF v_customer_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Cannot use ARK Coin without member customer'); END IF;
    PERFORM id FROM public.pos_customers WHERE id = v_customer_id FOR UPDATE;
    SELECT ark_coin_balance INTO v_cust_balance FROM public.pos_customers WHERE id = v_customer_id;
    IF v_cust_balance < p_ark_coins_used THEN
      RETURN jsonb_build_object('success', false, 'error', format('ARK Coin balance insufficient: %.0f needed, %.0f available', p_ark_coins_used, v_cust_balance));
    END IF;
    UPDATE public.pos_customers SET ark_coin_balance = ark_coin_balance - p_ark_coins_used WHERE id = v_customer_id;
  END IF;

  INSERT INTO public.pos_split_payments (split_id, order_id, amount, change_amount, payment_method, reference_number, cashier_id)
  VALUES (p_split_id, v_order_id, p_amount_paid, v_change, p_payment_method, p_reference_number, p_cashier_id);

  UPDATE public.pos_order_splits
  SET status = 'paid', payment_method = p_payment_method, amount_paid = p_amount_paid,
      change_amount = v_change, ark_coins_used = p_ark_coins_used, paid_at = now()
  WHERE id = p_split_id;

  SELECT COUNT(*) INTO v_total_splits FROM public.pos_order_splits WHERE order_id = v_order_id;
  SELECT COUNT(*) INTO v_all_paid_count FROM public.pos_order_splits WHERE order_id = v_order_id AND status = 'paid';

  IF v_all_paid_count = v_total_splits THEN
    UPDATE public.pos_orders SET payment_status = 'paid', completed_at = now() WHERE id = v_order_id;
  ELSIF v_all_paid_count >= 1 THEN
    UPDATE public.pos_orders SET payment_status = 'partial' WHERE id = v_order_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'split_id', p_split_id, 'change', v_change, 'paid_splits', v_all_paid_count, 'total_splits', v_total_splits);
END;
$$;

-- Sync PO payment term trigger function
CREATE OR REPLACE FUNCTION public.sync_purchase_order_payment_term()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.recalculate_purchase_order_payment_term(NEW.payment_term_id);
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.recalculate_purchase_order_payment_term(OLD.payment_term_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- HRIS notification helpers
CREATE OR REPLACE FUNCTION public.notify_hrd(p_type TEXT, p_title TEXT, p_message TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT id, p_type, p_title, p_message, p_data
  FROM public.users
  WHERE role = 'hrd';
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_user(p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_hrd_and_manager(p_type TEXT, p_title TEXT, p_message TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT id, p_type, p_title, p_message, p_data
  FROM public.users
  WHERE role IN ('hrd', 'hiring_manager', 'direksi');
END;
$$;

-- fn_notify_leave_changes (FIXED: uses ::text cast on CASE expression)
CREATE OR REPLACE FUNCTION public.fn_notify_leave_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_employee RECORD;
  v_leave_label TEXT;
  v_status_label TEXT;
BEGIN
  v_leave_label := CASE COALESCE(NEW.leave_type, OLD.leave_type)::text
    WHEN 'annual'      THEN 'Tahunan'
    WHEN 'sick'        THEN 'Sakit'
    WHEN 'emergency'   THEN 'Darurat'
    WHEN 'maternity'   THEN 'Melahirkan'
    WHEN 'paternity'   THEN 'Ayah'
    WHEN 'marriage'    THEN 'Pernikahan'
    WHEN 'bereavement' THEN 'Duka Cita'
    WHEN 'unpaid'      THEN 'Tanpa Bayar'
    ELSE 'Lainnya'
  END;

  v_status_label := CASE COALESCE(NEW.status, OLD.status)::text
    WHEN 'pending'   THEN 'Menunggu'
    WHEN 'approved'  THEN 'Disetujui'
    WHEN 'rejected'  THEN 'Ditolak'
    WHEN 'cancelled' THEN 'Dibatalkan'
    ELSE COALESCE(NEW.status, OLD.status)::text
  END;

  SELECT e.*, u.id AS user_id_val
  INTO v_employee
  FROM public.employees e
  LEFT JOIN public.users u ON u.id = e.user_id
  WHERE e.id = COALESCE(NEW.employee_id, OLD.employee_id);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_hrd('leave_request',
      'Permintaan Cuti Baru',
      v_employee.full_name || ' mengajukan cuti ' || v_leave_label,
      jsonb_build_object('leave_id', NEW.id, 'employee_id', NEW.employee_id));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF v_employee.user_id_val IS NOT NULL THEN
      PERFORM public.notify_user(v_employee.user_id_val, 'leave_status_update',
        'Status Cuti Diperbarui',
        'Cuti ' || v_leave_label || ' Anda ' || v_status_label,
        jsonb_build_object('leave_id', NEW.id));
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Logbook score update
CREATE OR REPLACE FUNCTION public.update_hris_logbook_entry_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total_score NUMERIC(5,2);
BEGIN
  SELECT COALESCE(SUM(lei.score * ti.weight / 100.0), 0)
  INTO v_total_score
  FROM public.hris_logbook_entry_items lei
  JOIN public.hris_logbook_template_items ti ON ti.id = lei.template_item_id
  WHERE lei.entry_id = COALESCE(NEW.entry_id, OLD.entry_id);

  UPDATE public.hris_logbook_entries
  SET total_score = v_total_score, updated_at = NOW()
  WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- 15. TRIGGERS
-- =============================================================================

-- generic updated_at triggers for core tables
DROP TRIGGER IF EXISTS trg_brands_updated_at ON public.brands;
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_positions_updated_at ON public.positions;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON public.employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_leaves_updated_at ON public.leaves;
CREATE TRIGGER trg_leaves_updated_at BEFORE UPDATE ON public.leaves FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_leave_balances_updated_at ON public.leave_balances;
CREATE TRIGGER trg_leave_balances_updated_at BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON public.inventory;
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_pos_orders_updated_at ON public.pos_orders;
CREATE TRIGGER trg_pos_orders_updated_at BEFORE UPDATE ON public.pos_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_pos_products_updated_at ON public.pos_products;
CREATE TRIGGER trg_pos_products_updated_at BEFORE UPDATE ON public.pos_products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_pos_customers_updated_at ON public.pos_customers;
CREATE TRIGGER trg_pos_customers_updated_at BEFORE UPDATE ON public.pos_customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- POS shift totals trigger
DROP TRIGGER IF EXISTS pos_order_shift_totals_trigger ON public.pos_orders;
CREATE TRIGGER pos_order_shift_totals_trigger
  AFTER UPDATE ON public.pos_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION public.pos_update_shift_totals();

-- Leave changes notification trigger
DROP TRIGGER IF EXISTS trg_notify_leave_changes ON public.leaves;
CREATE TRIGGER trg_notify_leave_changes
  AFTER INSERT OR UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_leave_changes();

-- Vendor payment sync trigger
DROP TRIGGER IF EXISTS trg_sync_purchase_order_payment_term ON public.vendor_payments;
CREATE TRIGGER trg_sync_purchase_order_payment_term
  AFTER INSERT OR UPDATE OR DELETE ON public.vendor_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_purchase_order_payment_term();

-- Logbook entry score trigger
DROP TRIGGER IF EXISTS trg_logbook_entry_score ON public.hris_logbook_entry_items;
CREATE TRIGGER trg_logbook_entry_score
  AFTER INSERT OR UPDATE OR DELETE ON public.hris_logbook_entry_items
  FOR EACH ROW EXECUTE FUNCTION public.update_hris_logbook_entry_score();

-- =============================================================================
-- 16. RLS POLICIES (supplemental — core policies are set inline above)
-- =============================================================================

-- Ensure RLS is enabled on all key tables
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_salary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_payment_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cogs_additional_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finished_goods_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_kds_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_kds_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_collectible_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_xp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_member_avatar_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_integration_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_external_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_template_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_template_behavioral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hris_logbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hris_logbook_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hris_logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hris_logbook_entry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistant_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistant_messages ENABLE ROW LEVEL SECURITY;

-- Allow all for POS operational tables (cashier/kitchen access)
DROP POLICY IF EXISTS "Allow all authenticated for pos" ON public.pos_categories;
CREATE POLICY "Allow all authenticated for pos" ON public.pos_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_products" ON public.pos_products;
CREATE POLICY "Allow all authenticated for pos_products" ON public.pos_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_orders" ON public.pos_orders;
CREATE POLICY "Allow all authenticated for pos_orders" ON public.pos_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_order_items" ON public.pos_order_items;
CREATE POLICY "Allow all authenticated for pos_order_items" ON public.pos_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_customers" ON public.pos_customers;
CREATE POLICY "Allow all authenticated for pos_customers" ON public.pos_customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_order_status_history" ON public.pos_order_status_history;
CREATE POLICY "Allow all authenticated for pos_order_status_history" ON public.pos_order_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_wallet_transactions" ON public.pos_wallet_transactions;
CREATE POLICY "Allow all authenticated for pos_wallet_transactions" ON public.pos_wallet_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_xp_transactions" ON public.pos_xp_transactions;
CREATE POLICY "Allow all authenticated for pos_xp_transactions" ON public.pos_xp_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_vouchers" ON public.pos_vouchers;
CREATE POLICY "Allow all authenticated for pos_vouchers" ON public.pos_vouchers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_kds_stations" ON public.pos_kds_stations;
CREATE POLICY "Allow all authenticated for pos_kds_stations" ON public.pos_kds_stations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_kds_orders" ON public.pos_kds_orders;
CREATE POLICY "Allow all authenticated for pos_kds_orders" ON public.pos_kds_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_print_jobs" ON public.pos_print_jobs;
CREATE POLICY "Allow all authenticated for pos_print_jobs" ON public.pos_print_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_product_variants" ON public.pos_product_variants;
CREATE POLICY "Allow all authenticated for pos_product_variants" ON public.pos_product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_modifier_groups" ON public.pos_modifier_groups;
CREATE POLICY "Allow all authenticated for pos_modifier_groups" ON public.pos_modifier_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_modifiers" ON public.pos_modifiers;
CREATE POLICY "Allow all authenticated for pos_modifiers" ON public.pos_modifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_product_modifiers" ON public.pos_product_modifiers;
CREATE POLICY "Allow all authenticated for pos_product_modifiers" ON public.pos_product_modifiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pos_recipes" ON public.pos_recipes;
CREATE POLICY "Allow all authenticated for pos_recipes" ON public.pos_recipes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM open policies
DROP POLICY IF EXISTS "Allow all authenticated for crm_membership_tiers" ON public.crm_membership_tiers;
CREATE POLICY "Allow all authenticated for crm_membership_tiers" ON public.crm_membership_tiers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for crm_collectible_avatars" ON public.crm_collectible_avatars;
CREATE POLICY "Allow all authenticated for crm_collectible_avatars" ON public.crm_collectible_avatars FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for crm_xp_rules" ON public.crm_xp_rules;
CREATE POLICY "Allow all authenticated for crm_xp_rules" ON public.crm_xp_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for crm_xp_ledger" ON public.crm_xp_ledger;
CREATE POLICY "Allow all authenticated for crm_xp_ledger" ON public.crm_xp_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for crm_rewards" ON public.crm_rewards;
CREATE POLICY "Allow all authenticated for crm_rewards" ON public.crm_rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for crm_redemptions" ON public.crm_redemptions;
CREATE POLICY "Allow all authenticated for crm_redemptions" ON public.crm_redemptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for crm_member_avatar_inventory" ON public.crm_member_avatar_inventory;
CREATE POLICY "Allow all authenticated for crm_member_avatar_inventory" ON public.crm_member_avatar_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for crm_integration_partners" ON public.crm_integration_partners;
CREATE POLICY "Allow all authenticated for crm_integration_partners" ON public.crm_integration_partners FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for crm_external_events" ON public.crm_external_events;
CREATE POLICY "Allow all authenticated for crm_external_events" ON public.crm_external_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- KPI open policies
DROP POLICY IF EXISTS "Allow all authenticated for kpi_templates" ON public.kpi_templates;
CREATE POLICY "Allow all authenticated for kpi_templates" ON public.kpi_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for kpi_template_mappings" ON public.kpi_template_mappings;
CREATE POLICY "Allow all authenticated for kpi_template_mappings" ON public.kpi_template_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for employee_kpis" ON public.employee_kpis;
CREATE POLICY "Allow all authenticated for employee_kpis" ON public.employee_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for kpi_progress_updates" ON public.kpi_progress_updates;
CREATE POLICY "Allow all authenticated for kpi_progress_updates" ON public.kpi_progress_updates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for behavioral_assessments" ON public.behavioral_assessments;
CREATE POLICY "Allow all authenticated for behavioral_assessments" ON public.behavioral_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for behavioral_review_items" ON public.behavioral_review_items;
CREATE POLICY "Allow all authenticated for behavioral_review_items" ON public.behavioral_review_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for kpi_template_behavioral" ON public.kpi_template_behavioral;
CREATE POLICY "Allow all authenticated for kpi_template_behavioral" ON public.kpi_template_behavioral FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for development_plans" ON public.development_plans;
CREATE POLICY "Allow all authenticated for development_plans" ON public.development_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for project_assignments" ON public.project_assignments;
CREATE POLICY "Allow all authenticated for project_assignments" ON public.project_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for behavioral_standards" ON public.behavioral_standards;
CREATE POLICY "Allow all authenticated for behavioral_standards" ON public.behavioral_standards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all authenticated for score_scales" ON public.score_scales;
CREATE POLICY "Allow all authenticated for score_scales" ON public.score_scales FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all authenticated for performance_categories" ON public.performance_categories;
CREATE POLICY "Allow all authenticated for performance_categories" ON public.performance_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for hris_logbook_templates" ON public.hris_logbook_templates;
CREATE POLICY "Allow all authenticated for hris_logbook_templates" ON public.hris_logbook_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for hris_logbook_template_items" ON public.hris_logbook_template_items;
CREATE POLICY "Allow all authenticated for hris_logbook_template_items" ON public.hris_logbook_template_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for hris_logbook_entry_items" ON public.hris_logbook_entry_items;
CREATE POLICY "Allow all authenticated for hris_logbook_entry_items" ON public.hris_logbook_entry_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Gamification open policies
DROP POLICY IF EXISTS "Allow all authenticated for user_xp_stats" ON public.user_xp_stats;
CREATE POLICY "Allow all authenticated for user_xp_stats" ON public.user_xp_stats FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for xp_activities" ON public.xp_activities;
CREATE POLICY "Allow all authenticated for xp_activities" ON public.xp_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for xp_badges" ON public.xp_badges;
CREATE POLICY "Allow all authenticated for xp_badges" ON public.xp_badges FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for user_badges" ON public.user_badges;
CREATE POLICY "Allow all authenticated for user_badges" ON public.user_badges FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for xp_challenges" ON public.xp_challenges;
CREATE POLICY "Allow all authenticated for xp_challenges" ON public.xp_challenges FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for user_challenge_progress" ON public.user_challenge_progress;
CREATE POLICY "Allow all authenticated for user_challenge_progress" ON public.user_challenge_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for xp_rewards" ON public.xp_rewards;
CREATE POLICY "Allow all authenticated for xp_rewards" ON public.xp_rewards FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for xp_redemptions" ON public.xp_redemptions;
CREATE POLICY "Allow all authenticated for xp_redemptions" ON public.xp_redemptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for employment_statuses" ON public.employment_statuses;
CREATE POLICY "Allow all authenticated for employment_statuses" ON public.employment_statuses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all authenticated for sections" ON public.sections;
CREATE POLICY "Allow all authenticated for sections" ON public.sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for staff_schedules" ON public.staff_schedules;
CREATE POLICY "Allow all authenticated for staff_schedules" ON public.staff_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for staff_sections" ON public.staff_sections;
CREATE POLICY "Allow all authenticated for staff_sections" ON public.staff_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for brands" ON public.brands;
CREATE POLICY "Allow all authenticated for brands" ON public.brands FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all authenticated for positions" ON public.positions;
CREATE POLICY "Allow all authenticated for positions" ON public.positions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all authenticated for benefits" ON public.benefits;
CREATE POLICY "Allow all authenticated for benefits" ON public.benefits FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for employee_benefits" ON public.employee_benefits;
CREATE POLICY "Allow all authenticated for employee_benefits" ON public.employee_benefits FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for loans" ON public.loans;
CREATE POLICY "Allow all authenticated for loans" ON public.loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for payroll_tax_config" ON public.payroll_tax_config;
CREATE POLICY "Allow all authenticated for payroll_tax_config" ON public.payroll_tax_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for bom_items" ON public.bom_items;
CREATE POLICY "Allow all authenticated for bom_items" ON public.bom_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for pr_items" ON public.pr_items;
CREATE POLICY "Allow all authenticated for pr_items" ON public.pr_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Allow all authenticated for purchase_order_items" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for grn_items" ON public.grn_items;
CREATE POLICY "Allow all authenticated for grn_items" ON public.grn_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for qc_inspections" ON public.qc_inspections;
CREATE POLICY "Allow all authenticated for qc_inspections" ON public.qc_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for deliveries" ON public.deliveries;
CREATE POLICY "Allow all authenticated for deliveries" ON public.deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for purchase_returns" ON public.purchase_returns;
CREATE POLICY "Allow all authenticated for purchase_returns" ON public.purchase_returns FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for purchase_return_items" ON public.purchase_return_items;
CREATE POLICY "Allow all authenticated for purchase_return_items" ON public.purchase_return_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for purchase_order_payment_terms" ON public.purchase_order_payment_terms;
CREATE POLICY "Allow all authenticated for purchase_order_payment_terms" ON public.purchase_order_payment_terms FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for vendor_payments" ON public.vendor_payments;
CREATE POLICY "Allow all authenticated for vendor_payments" ON public.vendor_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for cogs_additional_costs" ON public.cogs_additional_costs;
CREATE POLICY "Allow all authenticated for cogs_additional_costs" ON public.cogs_additional_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for production_order_materials" ON public.production_order_materials;
CREATE POLICY "Allow all authenticated for production_order_materials" ON public.production_order_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for production_batches" ON public.production_batches;
CREATE POLICY "Allow all authenticated for production_batches" ON public.production_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated for finished_goods_inventory" ON public.finished_goods_inventory;
CREATE POLICY "Allow all authenticated for finished_goods_inventory" ON public.finished_goods_inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================================================
-- 17. INDEXES
-- =============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_brand_id ON public.users(brand_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Candidates & recruitment
CREATE INDEX IF NOT EXISTS idx_candidates_brand ON public.candidates(brand_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_job_opening ON public.candidates(job_opening_id);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON public.interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_brand ON public.job_openings(brand_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_status ON public.job_openings(status);

-- Employees & HRIS
CREATE INDEX IF NOT EXISTS idx_employees_brand ON public.employees(brand_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON public.leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON public.leave_balances(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_onboarding_employee ON public.onboarding_checklists(employee_id);
CREATE INDEX IF NOT EXISTS idx_offboarding_employee ON public.offboarding_checklists(employee_id);

-- Purchasing
CREATE INDEX IF NOT EXISTS idx_units_not_deleted ON public.units(is_active, nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_not_deleted ON public.suppliers(is_active, nama_supplier) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_raw_materials_not_deleted ON public.raw_materials(is_active, nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_raw_materials_kategori ON public.raw_materials(kategori);
CREATE INDEX IF NOT EXISTS idx_products_not_deleted ON public.products(is_active, nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tanggal ON public.purchase_orders(tanggal_po DESC);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON public.grn(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON public.grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_inventory_raw_material ON public.inventory(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_material ON public.inventory_movements(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_payment_terms_po ON public.purchase_order_payment_terms(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_payment_terms_due ON public.purchase_order_payment_terms(status, due_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_vendor_payments_po ON public.vendor_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_supplier ON public.vendor_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_unit_conversions_material_id ON public.raw_material_unit_conversions(raw_material_id);

-- POS
CREATE INDEX IF NOT EXISTS idx_pos_orders_customer ON public.pos_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_cashier ON public.pos_orders(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_status ON public.pos_orders(status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_payment_status ON public.pos_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_pos_orders_ordered_at ON public.pos_orders(ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_orders_shift_id ON public.pos_orders(shift_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_order ON public.pos_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_product ON public.pos_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_kitchen_status ON public.pos_order_items(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_station_status ON public.pos_order_items(station, kitchen_status);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_profit_report ON public.pos_order_items(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_pos_customers_phone ON public.pos_customers(phone);
CREATE INDEX IF NOT EXISTS idx_pos_customers_tier ON public.pos_customers(membership_tier);
CREATE INDEX IF NOT EXISTS idx_pos_wallet_customer ON public.pos_wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_wallet_created ON public.pos_wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_xp_customer ON public.pos_xp_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_cashier ON public.pos_shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON public.pos_shifts(status);
CREATE UNIQUE INDEX IF NOT EXISTS pos_tables_table_number_key ON public.pos_tables(table_number);
CREATE INDEX IF NOT EXISTS idx_pos_order_splits_order ON public.pos_order_splits(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_order_splits_status ON public.pos_order_splits(status);
CREATE INDEX IF NOT EXISTS idx_pos_split_payments_split ON public.pos_split_payments(split_id);
CREATE INDEX IF NOT EXISTS pos_print_jobs_status_station_idx ON public.pos_print_jobs(status, station, requested_at DESC);
CREATE INDEX IF NOT EXISTS pos_print_jobs_order_id_idx ON public.pos_print_jobs(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS pos_print_jobs_station_order_pending_key ON public.pos_print_jobs(order_id, station, job_type) WHERE status IN ('pending', 'printing', 'failed');
CREATE INDEX IF NOT EXISTS pos_products_station_idx ON public.pos_products(station);
CREATE INDEX IF NOT EXISTS idx_pos_kds_station ON public.pos_kds_orders(station_id);
CREATE INDEX IF NOT EXISTS idx_pos_kds_status ON public.pos_kds_orders(status);
CREATE INDEX IF NOT EXISTS idx_pos_kds_order ON public.pos_kds_orders(order_id);

-- CRM
CREATE INDEX IF NOT EXISTS idx_crm_member_profiles_tier ON public.crm_member_profiles(tier_id);
CREATE INDEX IF NOT EXISTS idx_crm_xp_ledger_member ON public.crm_xp_ledger(member_id);
CREATE INDEX IF NOT EXISTS idx_crm_redemptions_member ON public.crm_redemptions(member_id);

-- KPI & Performance
CREATE INDEX IF NOT EXISTS idx_employee_kpis_employee ON public.employee_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_review ON public.employee_kpis(review_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON public.performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_hris_logbook_entries_employee ON public.hris_logbook_entries(employee_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_log_user ON public.notifications_log(user_id);

-- User approval permissions
CREATE UNIQUE INDEX IF NOT EXISTS user_approval_permissions_unique_active ON public.user_approval_permissions(user_id, module, workflow, approval_level) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS user_approval_permissions_user_idx ON public.user_approval_permissions(user_id);
CREATE INDEX IF NOT EXISTS user_approval_permissions_workflow_idx ON public.user_approval_permissions(module, workflow, is_active);
CREATE INDEX IF NOT EXISTS admin_user_audit_logs_target_user_idx ON public.admin_user_audit_logs(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_user_audit_logs_actor_idx ON public.admin_user_audit_logs(actor_id, created_at DESC);

-- AI assistant
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON public.ai_assistant_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON public.ai_assistant_messages(session_id, created_at);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
