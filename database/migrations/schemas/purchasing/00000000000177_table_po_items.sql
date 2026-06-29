-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: purchasing.po_items
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:29:36.319Z
-- =============================================================================

-- Table: purchasing.po_items
CREATE TABLE "purchasing"."po_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "po_id" uuid NOT NULL,
    "pr_item_id" uuid,
    "description" text NOT NULL,
    "qty" integer NOT NULL,
    "unit" text NOT NULL,
    "unit_price" numeric(15,2) DEFAULT 0 NOT NULL,
    "discount" numeric(15,2) DEFAULT 0,
    "total" numeric(15,2) DEFAULT 0 NOT NULL,
    "received_qty" integer DEFAULT 0,
    "notes" text
);

ALTER TABLE ONLY "purchasing"."po_items"
    ADD CONSTRAINT "po_items_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "purchasing"."po_items"
    ADD CONSTRAINT "po_items_qty_check" CHECK (qty > 0);

CREATE INDEX idx_po_items_po_id ON purchasing.po_items USING btree (po_id);
