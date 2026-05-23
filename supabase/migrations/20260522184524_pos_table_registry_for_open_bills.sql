CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

ALTER TABLE public.pos_tables
  ADD COLUMN IF NOT EXISTS table_number TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS pos_tables_table_number_key
  ON public.pos_tables (table_number);

ALTER TABLE public.pos_tables ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_num INTEGER;
  table_label TEXT;
  table_qr TEXT;
  table_capacity INTEGER;
  table_area TEXT;
  existing_id UUID;
BEGIN
  FOR table_num IN 1..20 LOOP
    table_label := 'Meja ' || table_num;
    table_qr := 'T-' || LPAD(table_num::TEXT, 2, '0');
    table_capacity := CASE
      WHEN table_num IN (1, 2, 3, 4) THEN 2
      WHEN table_num IN (15, 16, 17, 18, 19, 20) THEN 6
      ELSE 4
    END;
    table_area := CASE
      WHEN table_num <= 10 THEN 'Main Dining'
      WHEN table_num <= 16 THEN 'Terrace'
      ELSE 'VIP'
    END;

    SELECT id
    INTO existing_id
    FROM public.pos_tables
    WHERE qr_code = table_qr
       OR table_number = table_label
       OR table_number = table_qr
    ORDER BY
      CASE
        WHEN qr_code = table_qr THEN 1
        WHEN table_number = table_label THEN 2
        ELSE 3
      END
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE public.pos_tables
      SET
        table_number = COALESCE(NULLIF(table_number, ''), table_label),
        name = COALESCE(name, table_label),
        capacity = COALESCE(capacity, table_capacity),
        area = COALESCE(area, table_area),
        qr_code = COALESCE(qr_code, table_qr),
        is_active = TRUE,
        updated_at = NOW()
      WHERE id = existing_id;
    ELSE
      INSERT INTO public.pos_tables (table_number, name, capacity, area, status, qr_code, is_active)
      VALUES (table_label, table_label, table_capacity, table_area, 'available', table_qr, TRUE);
    END IF;
  END LOOP;
END $$;
