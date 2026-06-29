-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: manufacturing.bom
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:28:49.041Z
-- =============================================================================

-- Table: manufacturing.bom
CREATE TABLE "manufacturing"."bom" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "produk_id" uuid NOT NULL,
    "bahan_baku_id" uuid NOT NULL,
    "jumlah" numeric(15,6) NOT NULL,
    "satuan_id" uuid NOT NULL,
    "waste_percentage" numeric(5,2) DEFAULT 0,
    "urutan" integer DEFAULT 0,
    "catatan" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY "manufacturing"."bom"
    ADD CONSTRAINT "bom_produk_id_bahan_baku_id_key" UNIQUE (produk_id, bahan_baku_id);

ALTER TABLE ONLY "manufacturing"."bom"
    ADD CONSTRAINT "bom_pkey" PRIMARY KEY (id);

CREATE INDEX idx_bom_bahan_baku_id ON manufacturing.bom USING btree (bahan_baku_id);

CREATE INDEX idx_bom_is_active ON manufacturing.bom USING btree (is_active);

CREATE INDEX idx_bom_produk_id ON manufacturing.bom USING btree (produk_id);
