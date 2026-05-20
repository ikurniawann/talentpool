-- HRIS Department Logbook + KPI Checklist

CREATE TABLE IF NOT EXISTS hris_logbook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hris_logbook_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES hris_logbook_templates(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  weight NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hris_logbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES hris_logbook_templates(id) ON DELETE SET NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title VARCHAR(180) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'rejected')),
  completion_percentage NUMERIC(6,2) NOT NULL DEFAULT 0,
  kpi_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  notes TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department_id, template_id, entry_date)
);

CREATE TABLE IF NOT EXISTS hris_logbook_entry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES hris_logbook_entries(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES hris_logbook_template_items(id) ON DELETE SET NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT,
  weight NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hris_logbook_templates_department ON hris_logbook_templates(department_id, is_active);
CREATE INDEX IF NOT EXISTS idx_hris_logbook_template_items_template ON hris_logbook_template_items(template_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_hris_logbook_entries_department_date ON hris_logbook_entries(department_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_hris_logbook_entries_status ON hris_logbook_entries(status);
CREATE INDEX IF NOT EXISTS idx_hris_logbook_entry_items_entry ON hris_logbook_entry_items(entry_id, sort_order);

CREATE OR REPLACE FUNCTION update_hris_logbook_entry_score(p_entry_id UUID)
RETURNS VOID AS $$
DECLARE
  total_weight NUMERIC;
  checked_weight NUMERIC;
  total_items INTEGER;
  checked_items INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(weight), 0),
    COALESCE(SUM(CASE WHEN is_checked THEN weight ELSE 0 END), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE is_checked)
  INTO total_weight, checked_weight, total_items, checked_items
  FROM hris_logbook_entry_items
  WHERE entry_id = p_entry_id;

  UPDATE hris_logbook_entries
  SET
    completion_percentage = CASE WHEN total_items = 0 THEN 0 ELSE ROUND((checked_items::NUMERIC / total_items::NUMERIC) * 100, 2) END,
    kpi_score = CASE WHEN total_weight = 0 THEN 0 ELSE ROUND((checked_weight / total_weight) * 100, 2) END,
    updated_at = NOW()
  WHERE id = p_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trg_update_hris_logbook_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_hris_logbook_entry_score(COALESCE(NEW.entry_id, OLD.entry_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hris_logbook_item_score_refresh ON hris_logbook_entry_items;
CREATE TRIGGER hris_logbook_item_score_refresh
AFTER INSERT OR UPDATE OR DELETE ON hris_logbook_entry_items
FOR EACH ROW EXECUTE FUNCTION trg_update_hris_logbook_score();

ALTER TABLE hris_logbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hris_logbook_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hris_logbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hris_logbook_entry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage logbook templates" ON hris_logbook_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage logbook template items" ON hris_logbook_template_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage logbook entries" ON hris_logbook_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated manage logbook entry items" ON hris_logbook_entry_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE hris_logbook_templates IS 'Template checklist logbook per department untuk KPI HRIS';
COMMENT ON TABLE hris_logbook_entries IS 'Logbook aktual per department/tanggal hasil generate dari template';
