-- =============================================================================
-- Table: item.storage_conditions
-- Master kondisi penyimpanan bahan baku (lookup Items → Raw Material → Storage)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "item"."storage_conditions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "code" character varying(30) NOT NULL,
    "nama" character varying(100) NOT NULL,
    "deskripsi" text,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid,
    "updated_by" uuid,
    "deleted_at" timestamp with time zone,
    "deleted_by" uuid
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'storage_conditions_code_key'
      AND conrelid = 'item.storage_conditions'::regclass
  ) THEN
    ALTER TABLE ONLY "item"."storage_conditions"
      ADD CONSTRAINT "storage_conditions_code_key" UNIQUE (code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'storage_conditions_pkey'
      AND conrelid = 'item.storage_conditions'::regclass
  ) THEN
    ALTER TABLE ONLY "item"."storage_conditions"
      ADD CONSTRAINT "storage_conditions_pkey" PRIMARY KEY (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_storage_conditions_not_deleted
  ON item.storage_conditions USING btree (is_active, nama)
  WHERE (deleted_at IS NULL);
