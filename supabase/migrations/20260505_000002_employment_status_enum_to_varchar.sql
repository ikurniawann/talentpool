-- 1. Hapus default value yang pakai ENUM
ALTER TABLE employees
  ALTER COLUMN employment_status DROP DEFAULT;

-- 2. Convert kolom ke VARCHAR
ALTER TABLE employees
  ALTER COLUMN employment_status TYPE VARCHAR(50);

ALTER TABLE employment_history
  ALTER COLUMN prev_employment_status TYPE VARCHAR(50);

ALTER TABLE employment_history
  ALTER COLUMN new_employment_status TYPE VARCHAR(50);

-- 3. Drop function yang pakai ENUM
DROP FUNCTION IF EXISTS promote_candidate_to_employee(uuid, date, employment_status, uuid, uuid);

-- 4. Drop ENUM type
DROP TYPE IF EXISTS employment_status;

-- 5. Set default value baru pakai string biasa
ALTER TABLE employees
  ALTER COLUMN employment_status SET DEFAULT 'probation';

-- 6. Recreate function dengan VARCHAR
CREATE OR REPLACE FUNCTION promote_candidate_to_employee(
  p_candidate_id uuid,
  p_join_date date,
  p_employment_status varchar(50),
  p_department_id uuid,
  p_job_title_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_candidate record;
BEGIN
  SELECT * INTO v_candidate FROM candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  INSERT INTO employees (
    full_name, email, phone, join_date,
    employment_status, department_id, job_title_id
  ) VALUES (
    v_candidate.name, v_candidate.email, COALESCE(v_candidate.phone, ''),
    p_join_date, p_employment_status, p_department_id, p_job_title_id
  ) RETURNING id INTO v_employee_id;

  RETURN v_employee_id;
END;
$$;
