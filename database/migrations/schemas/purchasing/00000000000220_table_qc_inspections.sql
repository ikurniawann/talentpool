-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: purchasing.qc_inspections
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:30:02.692Z
-- =============================================================================

-- Table: purchasing.qc_inspections
CREATE TABLE "purchasing"."qc_inspections" (
    "id" uuid DEFAULT uuid_generate_v4() NOT NULL,
    "goods_receipt_id" uuid NOT NULL,
    "bahan_baku_id" uuid NOT NULL,
    "jumlah_diperiksa" numeric(15,3) DEFAULT 0 NOT NULL,
    "jumlah_diterima" numeric(15,3) DEFAULT 0 NOT NULL,
    "jumlah_ditolak" numeric(15,3) DEFAULT 0 NOT NULL,
    "hasil" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "parameter_inspeksi" jsonb,
    "catatan" text,
    "inspector_id" uuid,
    "tanggal_inspeksi" timestamp with time zone DEFAULT now(),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY "purchasing"."qc_inspections"
    ADD CONSTRAINT "qc_inspections_pkey" PRIMARY KEY (id);

CREATE INDEX idx_qc_bahan_baku_id ON purchasing.qc_inspections USING btree (bahan_baku_id);

CREATE INDEX idx_qc_gr_id ON purchasing.qc_inspections USING btree (goods_receipt_id);

CREATE INDEX idx_qc_hasil ON purchasing.qc_inspections USING btree (hasil);

CREATE INDEX idx_qc_inspector ON purchasing.qc_inspections USING btree (inspector_id);
