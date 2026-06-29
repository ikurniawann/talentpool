-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: item.bahan_baku
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:28:45.710Z
-- =============================================================================

-- Table: item.bahan_baku
CREATE TABLE "item"."bahan_baku" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "kode" character varying(50) NOT NULL,
    "nama" character varying(200) NOT NULL,
    "deskripsi" text,
    "satuan_id" uuid NOT NULL,
    "kategori" character varying(50),
    "harga_estimasi" numeric(15,2),
    "minimum_stock" numeric(15,3) DEFAULT 0,
    "maximum_stock" numeric(15,3),
    "lokasi_rak" character varying(100),
    "lead_time_days" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "satuan_kecil_id" uuid,
    "konversi_factor" numeric(10,4) DEFAULT 1,
    "shelf_life_days" integer DEFAULT 0,
    "storage_condition" character varying(50) DEFAULT 'ambient'::character varying
);

ALTER TABLE ONLY "item"."bahan_baku"
    ADD CONSTRAINT "bahan_baku_kode_key" UNIQUE (kode);

ALTER TABLE ONLY "item"."bahan_baku"
    ADD CONSTRAINT "bahan_baku_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "item"."bahan_baku"
    ADD CONSTRAINT "chk_kategori" CHECK ((kategori::text = ANY (ARRAY['BAHAN_PANGAN'::character varying, 'BAHAN_NON_PANGAN'::character varying, 'KEMASAN'::character varying, 'BAHAN_BAKAR'::character varying, 'LAINNYA'::character varying]::text[])) OR kategori IS NULL);

CREATE INDEX idx_bahan_baku_is_active ON item.bahan_baku USING btree (is_active);

CREATE INDEX idx_bahan_baku_kategori ON item.bahan_baku USING btree (kategori);

CREATE INDEX idx_bahan_baku_kode ON item.bahan_baku USING btree (kode);

CREATE INDEX idx_bahan_baku_konversi ON item.bahan_baku USING btree (konversi_factor);

CREATE INDEX idx_bahan_baku_nama ON item.bahan_baku USING btree (nama);

CREATE INDEX idx_bahan_baku_satuan_id ON item.bahan_baku USING btree (satuan_id);

CREATE INDEX idx_bahan_baku_satuan_kecil ON item.bahan_baku USING btree (satuan_kecil_id);

CREATE INDEX idx_bahan_baku_shelf_life ON item.bahan_baku USING btree (shelf_life_days);
