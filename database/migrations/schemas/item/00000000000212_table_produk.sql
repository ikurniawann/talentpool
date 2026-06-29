-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: item.produk
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:29:57.718Z
-- =============================================================================

-- Table: item.produk
CREATE TABLE "item"."produk" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "kode" character varying(50) NOT NULL,
    "nama" character varying(200) NOT NULL,
    "deskripsi" text,
    "satuan_id" uuid NOT NULL,
    "kategori" character varying(50),
    "harga_jual" numeric(15,2),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY "item"."produk"
    ADD CONSTRAINT "produk_kode_key" UNIQUE (kode);

ALTER TABLE ONLY "item"."produk"
    ADD CONSTRAINT "produk_pkey" PRIMARY KEY (id);

CREATE INDEX idx_produk_is_active ON item.produk USING btree (is_active);

CREATE INDEX idx_produk_kategori ON item.produk USING btree (kategori);

CREATE INDEX idx_produk_kode ON item.produk USING btree (kode);

CREATE INDEX idx_produk_nama ON item.produk USING btree (nama);

CREATE INDEX idx_produk_satuan_id ON item.produk USING btree (satuan_id);
