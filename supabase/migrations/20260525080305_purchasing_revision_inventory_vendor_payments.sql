-- Purchasing revision:
-- - expose stock aliases consumed by reports
-- - make PO view use header totals including PPN
-- - prepare vendor payment terms and payment records

CREATE OR REPLACE VIEW public.v_raw_materials_stock AS
SELECT
    rm.id,
    rm.kode,
    rm.nama,
    rm.kategori,
    rm.deskripsi,
    rm.satuan_besar_id,
    rm.satuan_kecil_id,
    rm.konversi_factor,
    rm.stok_minimum,
    rm.stok_maximum,
    rm.shelf_life_days,
    rm.storage_condition,
    rm.is_active,
    rm.created_at,
    rm.updated_at,
    rm.created_by,
    rm.updated_by,
    u1.nama AS satuan_besar_nama,
    u2.nama AS satuan_kecil_nama,
    COALESCE(i.qty_available, 0) AS qty_onhand,
    0 AS qty_reserved,
    COALESCE(i.qty_on_order, 0) AS qty_on_order,
    COALESCE(i.unit_cost, 0) AS avg_cost,
    CASE
        WHEN COALESCE(i.qty_available, 0) <= 0 THEN 'HABIS'
        WHEN COALESCE(i.qty_available, 0) <= COALESCE(i.qty_minimum, rm.stok_minimum, 0) THEN 'MENIPIS'
        ELSE 'AMAN'
    END AS status_stok,
    COALESCE(rm.material_type, 'PURCHASED') AS material_type,
    rm.source_product_id,
    rm.deleted_at,
    rm.deleted_by,
    u1.nama AS satuan,
    COALESCE(i.lokasi_rak, '-') AS lokasi_rak,
    COALESCE(i.qty_minimum, rm.stok_minimum, 0) AS min_stock,
    COALESCE(i.qty_maximum, rm.stok_maximum) AS max_stock,
    COALESCE(i.unit_cost, 0) AS unit_cost,
    (COALESCE(i.qty_available, 0) * COALESCE(i.unit_cost, 0)) AS total_value
FROM public.raw_materials rm
LEFT JOIN public.units u1 ON rm.satuan_besar_id = u1.id
LEFT JOIN public.units u2 ON rm.satuan_kecil_id = u2.id
LEFT JOIN public.inventory i ON rm.id = i.raw_material_id AND i.is_active = TRUE
WHERE rm.deleted_at IS NULL;

WITH latest_purchase_cost AS (
  SELECT DISTINCT ON (gi.raw_material_id)
    gi.raw_material_id,
    COALESCE(poi.harga_satuan, 0) AS unit_cost
  FROM public.grn_items gi
  JOIN public.grn g ON g.id = gi.grn_id
  LEFT JOIN public.purchase_order_items poi ON poi.id = gi.purchase_order_item_id
  WHERE gi.is_active = TRUE
    AND gi.qty_diterima > 0
    AND COALESCE(poi.harga_satuan, 0) > 0
  ORDER BY gi.raw_material_id, g.created_at DESC
)
UPDATE public.inventory i
SET unit_cost = latest_purchase_cost.unit_cost,
    updated_at = NOW()
FROM latest_purchase_cost
WHERE i.raw_material_id = latest_purchase_cost.raw_material_id
  AND COALESCE(i.unit_cost, 0) = 0;

DROP VIEW IF EXISTS public.v_purchase_orders;

CREATE OR REPLACE VIEW public.v_purchase_orders AS
SELECT
    po.*,
    production.nomor_produksi AS production_order_number,
    s.nama_supplier,
    s.kode AS supplier_kode,
    s.pic_name AS supplier_pic,
    s.email AS supplier_email,
    COALESCE(item_stats.total_items, 0) AS total_items,
    COALESCE(item_stats.total_items, 0) AS item_count,
    COALESCE(item_stats.total_qty, 0) AS total_qty,
    COALESCE(item_stats.total_qty, 0) AS total_qty_ordered,
    COALESCE(item_stats.received_qty, 0) AS total_qty_received,
    COALESCE(item_stats.total_value, 0) AS total_value,
    COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) AS calculated_subtotal,
    COALESCE(
      NULLIF(po.ppn_nominal, 0),
      ROUND((COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) - COALESCE(po.diskon_nominal, 0)) * COALESCE(po.ppn_persen, 0) / 100, 2),
      0
    ) AS calculated_ppn_nominal,
    COALESCE(
      NULLIF(po.total, 0),
      COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0)
        - COALESCE(po.diskon_nominal, 0)
        + COALESCE(NULLIF(po.ppn_nominal, 0), ROUND((COALESCE(NULLIF(po.subtotal, 0), item_stats.total_value, 0) - COALESCE(po.diskon_nominal, 0)) * COALESCE(po.ppn_persen, 0) / 100, 2), 0),
      0
    ) AS grand_total,
    COALESCE(item_stats.received_items, 0) AS received_items,
    CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100, 2)
    END AS progress_pct,
    CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100, 2)
    END AS receive_percentage,
    CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100, 2)
    END AS received_percentage
FROM public.purchase_orders po
LEFT JOIN public.production_orders production ON production.id = po.production_order_id
LEFT JOIN public.suppliers s ON s.id = po.supplier_id
LEFT JOIN (
    SELECT
        purchase_order_id,
        COUNT(*) AS total_items,
        COALESCE(SUM(qty_ordered), 0) AS total_qty,
        COALESCE(SUM(subtotal), 0) AS total_value,
        COALESCE(SUM(CASE WHEN qty_received >= qty_ordered THEN 1 ELSE 0 END), 0) AS received_items,
        COALESCE(SUM(qty_received), 0) AS received_qty
    FROM public.purchase_order_items
    WHERE is_active = TRUE
    GROUP BY purchase_order_id
) item_stats ON item_stats.purchase_order_id = po.id
WHERE po.is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.purchase_order_payment_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  term_no INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  due_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (purchase_order_id, term_no)
);

CREATE TABLE IF NOT EXISTS public.vendor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  payment_term_id UUID REFERENCES public.purchase_order_payment_terms(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  method TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (method IN ('cash', 'bank_transfer', 'giro', 'qris', 'other')),
  reference_number TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_payment_terms_po
  ON public.purchase_order_payment_terms(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_po_payment_terms_due
  ON public.purchase_order_payment_terms(status, due_date)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vendor_payments_po
  ON public.vendor_payments(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_supplier
  ON public.vendor_payments(supplier_id);

CREATE OR REPLACE VIEW public.v_purchase_order_payments AS
SELECT
  po.id AS purchase_order_id,
  po.nomor_po,
  po.supplier_id,
  s.nama_supplier,
  COALESCE(NULLIF(po.total, 0), po.subtotal - COALESCE(po.diskon_nominal, 0) + COALESCE(po.ppn_nominal, 0), 0) AS payable_amount,
  COALESCE(term_stats.term_amount, 0) AS scheduled_amount,
  COALESCE(term_stats.paid_amount, 0) AS paid_amount,
  GREATEST(COALESCE(NULLIF(po.total, 0), po.subtotal - COALESCE(po.diskon_nominal, 0) + COALESCE(po.ppn_nominal, 0), 0) - COALESCE(term_stats.paid_amount, 0), 0) AS outstanding_amount,
  term_stats.next_due_date,
  CASE
    WHEN COALESCE(term_stats.paid_amount, 0) >= COALESCE(NULLIF(po.total, 0), po.subtotal - COALESCE(po.diskon_nominal, 0) + COALESCE(po.ppn_nominal, 0), 0) THEN 'paid'
    WHEN COALESCE(term_stats.paid_amount, 0) > 0 THEN 'partial'
    WHEN term_stats.next_due_date IS NOT NULL AND term_stats.next_due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'unpaid'
  END AS payment_status
FROM public.purchase_orders po
LEFT JOIN public.suppliers s ON s.id = po.supplier_id
LEFT JOIN (
  SELECT
    purchase_order_id,
    SUM(amount) AS term_amount,
    SUM(paid_amount) AS paid_amount,
    MIN(due_date) FILTER (WHERE status IN ('unpaid', 'partial', 'overdue') AND is_active = TRUE) AS next_due_date
  FROM public.purchase_order_payment_terms
  WHERE is_active = TRUE
  GROUP BY purchase_order_id
) term_stats ON term_stats.purchase_order_id = po.id
WHERE po.is_active = TRUE;

INSERT INTO public.purchase_order_payment_terms (
  purchase_order_id,
  supplier_id,
  term_no,
  description,
  due_date,
  amount,
  paid_amount,
  status
)
SELECT
  po.id,
  po.supplier_id,
  1,
  'Termin 1',
  (COALESCE(po.tanggal_kirim_estimasi, po.tanggal_po, CURRENT_DATE) + INTERVAL '14 days')::DATE,
  COALESCE(NULLIF(po.total, 0), po.subtotal - COALESCE(po.diskon_nominal, 0) + COALESCE(po.ppn_nominal, 0), 0),
  0,
  CASE
    WHEN COALESCE(NULLIF(po.total, 0), po.subtotal - COALESCE(po.diskon_nominal, 0) + COALESCE(po.ppn_nominal, 0), 0) <= 0 THEN 'paid'
    WHEN COALESCE(po.tanggal_kirim_estimasi, po.tanggal_po, CURRENT_DATE) + INTERVAL '14 days' < CURRENT_DATE THEN 'overdue'
    ELSE 'unpaid'
  END
FROM public.purchase_orders po
WHERE po.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.purchase_order_payment_terms term
    WHERE term.purchase_order_id = po.id
      AND term.term_no = 1
  );
