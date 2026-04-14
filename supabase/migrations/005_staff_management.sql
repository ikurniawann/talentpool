-- ============================================================
-- Staff Management Module
-- Tables: sections, staff, staff_schedules, staff_sections
-- ============================================================

-- Sections (areas / zones within a brand, e.g. Kitchen, Cashier, Dining)
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff (employees of the brand)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  employee_code TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  hire_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned')),
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff Schedules (weekly recurring schedule)
CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_off BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, day_of_week, effective_from)
);

-- Staff Section Assignments (which section each staff works at)
CREATE TABLE IF NOT EXISTS staff_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, section_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sections_brand ON sections(brand_id);
CREATE INDEX IF NOT EXISTS idx_staff_brand ON staff(brand_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff ON staff_schedules(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sections_staff ON staff_sections(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sections_section ON staff_sections(section_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_sections ENABLE ROW LEVEL SECURITY;

-- Sections: HRD full access, others read-only
CREATE POLICY "HRD full access to sections"
  ON sections FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Everyone can read sections"
  ON sections FOR SELECT
  USING (true);

-- Staff: HRD full access, others read-only
CREATE POLICY "HRD full access to staff"
  ON staff FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Everyone can read staff"
  ON staff FOR SELECT
  USING (true);

-- Staff Schedules: HRD full access
CREATE POLICY "HRD full access to staff_schedules"
  ON staff_schedules FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Everyone can read staff_schedules"
  ON staff_schedules FOR SELECT
  USING (true);

-- Staff Sections: HRD full access
CREATE POLICY "HRD full access to staff_sections"
  ON staff_sections FOR ALL
  USING (is_hrd() = true);

CREATE POLICY "Everyone can read staff_sections"
  ON staff_sections FOR SELECT
  USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on staff
CREATE OR REPLACE FUNCTION update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_staff_updated_at();
