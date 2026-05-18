-- Store KPI target wording exactly as written in the Excel template.
-- target_value remains for backward compatibility with older numeric flows.
ALTER TABLE IF EXISTS kpi_template_items
  ADD COLUMN IF NOT EXISTS target_text TEXT;

ALTER TABLE IF EXISTS employee_kpis
  ADD COLUMN IF NOT EXISTS target_text TEXT;
