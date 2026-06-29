-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: purchasing.po_details
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:29:35.737Z
-- =============================================================================

-- Table: purchasing.po_details
CREATE TABLE "purchasing"."po_details" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "purchase_order_id" uuid NOT NULL,
    "bahan_baku_id" uuid NOT NULL,
    "jumlah" numeric(15,3) NOT NULL,
    "satuan_id" uuid NOT NULL,
    "harga_unit" numeric(15,2) NOT NULL,
    "subtotal" numeric(15,2) NOT NULL,
    "diskon_persen" numeric(5,2) DEFAULT 0,
    "diskon_nominal" numeric(15,2) DEFAULT 0,
    "total" numeric(15,2) NOT NULL,
    "jumlah_diterima" numeric(15,3) DEFAULT 0,
    "catatan" text,
    "urutan" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY "purchasing"."po_details"
    ADD CONSTRAINT "po_details_pkey" PRIMARY KEY (id);

CREATE INDEX idx_po_detail_bahan_baku_id ON purchasing.po_details USING btree (bahan_baku_id);

CREATE INDEX idx_po_detail_po_id ON purchasing.po_details USING btree (purchase_order_id);
