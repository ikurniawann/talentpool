-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: purchasing.goods_receipts
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:29:17.754Z
-- =============================================================================

-- Table: purchasing.goods_receipts
CREATE TABLE "purchasing"."goods_receipts" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "nomor_gr" character varying(50) NOT NULL,
    "purchase_order_id" uuid NOT NULL,
    "delivery_id" uuid,
    "tanggal_terima" date DEFAULT CURRENT_DATE NOT NULL,
    "penerima_id" uuid,
    "status" character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    "total_item" numeric(15,3) DEFAULT 0,
    "total_diterima" numeric(15,3) DEFAULT 0,
    "total_ditolak" numeric(15,3) DEFAULT 0,
    "catatan" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY "purchasing"."goods_receipts"
    ADD CONSTRAINT "goods_receipts_nomor_gr_key" UNIQUE (nomor_gr);

ALTER TABLE ONLY "purchasing"."goods_receipts"
    ADD CONSTRAINT "goods_receipts_pkey" PRIMARY KEY (id);

CREATE INDEX idx_gr_nomor ON purchasing.goods_receipts USING btree (nomor_gr);

CREATE INDEX idx_gr_po_id ON purchasing.goods_receipts USING btree (purchase_order_id);

CREATE INDEX idx_gr_status ON purchasing.goods_receipts USING btree (status);
