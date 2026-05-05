-- Master Data: employment_statuses table
CREATE TABLE IF NOT EXISTS employment_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) DEFAULT 'gray',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial statuses
INSERT INTO employment_statuses (code, name, color) VALUES
  ('probation', 'Probasi', 'yellow'),
  ('contract', 'Kontrak', 'blue'),
  ('permanent', 'Tetap', 'green'),
  ('internship', 'Magang', 'purple'),
  ('resigned', 'Resign', 'red'),
  ('terminated', 'PHK', 'red'),
  ('suspended', 'Suspend', 'orange')
ON CONFLICT (code) DO NOTHING;

-- RLS
ALTER TABLE employment_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all employment_statuses" ON employment_statuses FOR ALL USING (true) WITH CHECK (true);

-- Make positions.brand_id nullable
ALTER TABLE positions ALTER COLUMN brand_id DROP NOT NULL;

-- Add updated_at to departments if missing
ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
