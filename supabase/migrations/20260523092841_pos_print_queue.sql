CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.pos_print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  station TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'kitchen_ticket',
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pos_print_jobs
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.pos_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS station TEXT NOT NULL DEFAULT 'kitchen',
  ADD COLUMN IF NOT EXISTS job_type TEXT NOT NULL DEFAULT 'kitchen_ticket',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_print_jobs_station_check'
  ) THEN
    ALTER TABLE public.pos_print_jobs
      ADD CONSTRAINT pos_print_jobs_station_check
      CHECK (station IN ('kitchen', 'bar', 'bakery', 'dessert', 'merchandise', 'photobooth'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_print_jobs_status_check'
  ) THEN
    ALTER TABLE public.pos_print_jobs
      ADD CONSTRAINT pos_print_jobs_status_check
      CHECK (status IN ('pending', 'printing', 'printed', 'failed', 'cancelled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_print_jobs_job_type_check'
  ) THEN
    ALTER TABLE public.pos_print_jobs
      ADD CONSTRAINT pos_print_jobs_job_type_check
      CHECK (job_type IN ('kitchen_ticket', 'bar_ticket', 'customer_receipt', 'void_ticket'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pos_print_jobs_status_station_idx
  ON public.pos_print_jobs (status, station, requested_at DESC);

CREATE INDEX IF NOT EXISTS pos_print_jobs_order_id_idx
  ON public.pos_print_jobs (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS pos_print_jobs_station_order_pending_key
  ON public.pos_print_jobs (order_id, station, job_type)
  WHERE status IN ('pending', 'printing', 'failed');
