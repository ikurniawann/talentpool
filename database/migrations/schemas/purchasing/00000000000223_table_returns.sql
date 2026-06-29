-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: purchasing.returns
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:30:04.494Z
-- =============================================================================

-- Table: purchasing.returns
CREATE TABLE "purchasing"."returns" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "nomor_return" character varying(50) NOT NULL,
    "goods_receipt_id" uuid NOT NULL,
    "supplier_id" uuid NOT NULL,
    "bahan_baku_id" uuid NOT NULL,
    "jumlah" numeric(15,3) NOT NULL,
    "satuan_id" uuid NOT NULL,
    "alasan" text NOT NULL,
    "status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "tanggal_pengembalian" date,
    "nomor_resi" character varying(100),
    "catatan" text,
    "approved_by" uuid,
    "approved_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY "purchasing"."returns"
    ADD CONSTRAINT "returns_nomor_return_key" UNIQUE (nomor_return);

ALTER TABLE ONLY "purchasing"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY (id);

CREATE INDEX idx_returns_bahan_baku_id ON purchasing.returns USING btree (bahan_baku_id);

CREATE INDEX idx_returns_gr_id ON purchasing.returns USING btree (goods_receipt_id);

CREATE INDEX idx_returns_nomor ON purchasing.returns USING btree (nomor_return);

CREATE INDEX idx_returns_status ON purchasing.returns USING btree (status);

CREATE INDEX idx_returns_supplier_id ON purchasing.returns USING btree (supplier_id);
