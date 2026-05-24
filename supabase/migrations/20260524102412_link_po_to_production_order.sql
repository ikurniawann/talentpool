ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS production_order_id UUID REFERENCES public.production_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_reference TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_orders_source_type_check'
  ) THEN
    ALTER TABLE public.purchase_orders
      ADD CONSTRAINT purchase_orders_source_type_check
      CHECK (source_type IS NULL OR source_type IN ('manual', 'production_order', 'low_stock'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_po_source_type
  ON public.purchase_orders(source_type);

CREATE INDEX IF NOT EXISTS idx_po_production_order
  ON public.purchase_orders(production_order_id)
  WHERE production_order_id IS NOT NULL;

DROP VIEW IF EXISTS public.v_purchase_orders;

CREATE OR REPLACE VIEW public.v_purchase_orders AS
SELECT
    po.*,
    production.nomor_produksi AS production_order_number,
    s.nama_supplier,
    s.kode as supplier_kode,
    s.pic_name as supplier_pic,
    s.email as supplier_email,
    COALESCE(item_stats.total_items, 0) as total_items,
    COALESCE(item_stats.total_items, 0) as item_count,
    COALESCE(item_stats.total_qty, 0) as total_qty,
    COALESCE(item_stats.total_qty, 0) as total_qty_ordered,
    COALESCE(item_stats.received_qty, 0) as total_qty_received,
    COALESCE(item_stats.total_value, 0) as total_value,
    COALESCE(item_stats.grand_total, 0) as grand_total,
    COALESCE(item_stats.received_items, 0) as received_items,
    CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100)
    END as progress_pct,
    CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100)
    END as receive_percentage
FROM public.purchase_orders po
LEFT JOIN public.production_orders production ON production.id = po.production_order_id
LEFT JOIN public.suppliers s ON s.id = po.supplier_id
LEFT JOIN (
    SELECT
        purchase_order_id,
        COUNT(*) as total_items,
        COALESCE(SUM(qty_ordered), 0) as total_qty,
        COALESCE(SUM(subtotal), 0) as total_value,
        COALESCE(SUM(
            (qty_ordered * harga_satuan) -
            COALESCE(diskon_item, 0)
        ), 0) as grand_total,
        COALESCE(SUM(CASE WHEN qty_received >= qty_ordered THEN 1 ELSE 0 END), 0) as received_items,
        COALESCE(SUM(qty_received), 0) as received_qty
    FROM public.purchase_order_items
    WHERE is_active = true
    GROUP BY purchase_order_id
) item_stats ON item_stats.purchase_order_id = po.id
WHERE po.is_active = true;

COMMENT ON COLUMN public.purchase_orders.source_type IS 'Asal pembuatan PO: manual, production_order, atau low_stock.';
COMMENT ON COLUMN public.purchase_orders.production_order_id IS 'Production order asal jika PO dibuat untuk shortage bahan produksi.';
COMMENT ON COLUMN public.purchase_orders.source_reference IS 'Nomor/reference sumber PO untuk audit ringan.';
COMMENT ON VIEW public.v_purchase_orders IS 'Purchase orders with calculated progress, supplier data, and source reference.';
