-- Snapshot product cost on every POS order item so historical profit reports
-- are not affected by future HPP changes.

ALTER TABLE public.pos_order_items
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_margin_pct NUMERIC(8,2) NOT NULL DEFAULT 0;

UPDATE public.pos_order_items oi
SET
  cost_price = COALESCE(oi.cost_price, p.cost_price, 0),
  cost_total = ROUND((COALESCE(oi.quantity, 0) * COALESCE(p.cost_price, oi.cost_price, 0))::numeric, 2),
  gross_profit = ROUND((COALESCE(oi.total_amount, oi.subtotal, 0) - (COALESCE(oi.quantity, 0) * COALESCE(p.cost_price, oi.cost_price, 0)))::numeric, 2),
  gross_margin_pct = CASE
    WHEN COALESCE(oi.total_amount, oi.subtotal, 0) > 0 THEN
      ROUND(((COALESCE(oi.total_amount, oi.subtotal, 0) - (COALESCE(oi.quantity, 0) * COALESCE(p.cost_price, oi.cost_price, 0))) / COALESCE(oi.total_amount, oi.subtotal, 0) * 100)::numeric, 2)
    ELSE 0
  END
FROM public.pos_products p
WHERE oi.product_id = p.id
  AND (oi.cost_price = 0 OR oi.cost_total = 0);

CREATE INDEX IF NOT EXISTS idx_pos_order_items_profit_report
  ON public.pos_order_items(order_id, product_id);

COMMENT ON COLUMN public.pos_order_items.cost_price IS 'Snapshot unit HPP/cost at order time, copied from pos_products.cost_price.';
COMMENT ON COLUMN public.pos_order_items.cost_total IS 'Snapshot total item cost: cost_price * quantity.';
COMMENT ON COLUMN public.pos_order_items.gross_profit IS 'Snapshot gross profit for this item: total_amount - cost_total.';
COMMENT ON COLUMN public.pos_order_items.gross_margin_pct IS 'Snapshot gross margin percentage for this item.';
