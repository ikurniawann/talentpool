-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: item.satuan
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:30:05.100Z
-- =============================================================================

-- Table: item.satuan
CREATE TABLE "item"."satuan" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "kode" character varying(20) NOT NULL,
    "nama" character varying(100) NOT NULL,
    "deskripsi" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY "item"."satuan"
    ADD CONSTRAINT "satuan_kode_key" UNIQUE (kode);

ALTER TABLE ONLY "item"."satuan"
    ADD CONSTRAINT "satuan_pkey" PRIMARY KEY (id);

CREATE INDEX idx_satuan_is_active ON item.satuan USING btree (is_active);

CREATE INDEX idx_satuan_kode ON item.satuan USING btree (kode);
