-- Migration: Add RLS policies for deliveries table
-- Enable insert for purchasing_admin and purchasing_staff

-- Enable RLS
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for purchasing" ON deliveries;
DROP POLICY IF EXISTS "Enable insert for purchasing" ON deliveries;
DROP POLICY IF EXISTS "Enable update for purchasing" ON deliveries;

-- Policy: Allow select for authenticated users with purchasing roles
CREATE POLICY "Enable read access for purchasing"
ON deliveries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('purchasing_admin', 'purchasing_staff', 'warehouse_staff', 'qc_staff', 'admin')
  )
);

-- Policy: Allow insert for purchasing roles
CREATE POLICY "Enable insert for purchasing"
ON deliveries
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('purchasing_admin', 'purchasing_staff')
  )
);

-- Policy: Allow update for purchasing roles
CREATE POLICY "Enable update for purchasing"
ON deliveries
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('purchasing_admin', 'purchasing_staff', 'warehouse_staff', 'qc_staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('purchasing_admin', 'purchasing_staff', 'warehouse_staff', 'qc_staff')
  )
);
