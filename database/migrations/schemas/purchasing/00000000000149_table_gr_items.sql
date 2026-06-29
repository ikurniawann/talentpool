-- =============================================================================
-- AUTO-GENERATED dari PostgreSQL (introspeksi pg_catalog) — table: purchasing.gr_items
-- JANGAN edit manual; regenerate via: npm run db:pull
-- Generated: 2026-06-24T07:29:18.335Z
-- =============================================================================

-- Table: purchasing.gr_items
CREATE TABLE "purchasing"."gr_items" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "gr_id" uuid NOT NULL,
    "po_item_id" uuid NOT NULL,
    "received_qty" integer NOT NULL,
    "condition" text,
    "notes" text
);

ALTER TABLE ONLY "purchasing"."gr_items"
    ADD CONSTRAINT "gr_items_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY "purchasing"."gr_items"
    ADD CONSTRAINT "gr_items_condition_check" CHECK (condition = ANY (ARRAY['good'::text, 'damaged'::text, 'incomplete'::text]));

ALTER TABLE ONLY "purchasing"."gr_items"
    ADD CONSTRAINT "gr_items_received_qty_check" CHECK (received_qty > 0);
