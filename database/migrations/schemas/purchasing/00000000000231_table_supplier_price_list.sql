-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: purchasing.supplier_price_list
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:30:09.410Z
-- =============================================================================

-- Table: purchasing.supplier_price_list
CREATE TABLE "purchasing"."supplier_price_list" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "supplier_id" uuid,
    "raw_material_id" uuid,
    "harga" numeric(15,2) NOT NULL,
    "satuan_id" uuid,
    "min_qty" numeric(12,4) DEFAULT 1,
    "lead_time_days" integer DEFAULT 0,
    "is_preferred" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "berlaku_mulai" date DEFAULT CURRENT_DATE,
    "berlaku_sampai" date,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "created_by" uuid,
    "updated_by" uuid
);

ALTER TABLE ONLY "purchasing"."supplier_price_list"
    ADD CONSTRAINT "supplier_price_list_supplier_id_raw_material_id_key" UNIQUE (supplier_id, raw_material_id);

ALTER TABLE ONLY "purchasing"."supplier_price_list"
    ADD CONSTRAINT "supplier_price_list_pkey" PRIMARY KEY (id);

CREATE INDEX idx_price_material ON purchasing.supplier_price_list USING btree (raw_material_id);

CREATE INDEX idx_price_preferred ON purchasing.supplier_price_list USING btree (is_preferred);

CREATE INDEX idx_price_supplier ON purchasing.supplier_price_list USING btree (supplier_id);
