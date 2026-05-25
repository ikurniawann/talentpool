-- Repair historical POS item unit-cost snapshots after the initial column add.
-- The first backfill can preserve cost_price = 0 because the new column has a
-- default value, so this explicitly copies the current product cost when the
-- item unit cost is still empty.

UPDATE public.pos_order_items oi
SET
  cost_price = COALESCE(p.cost_price, 0),
  cost_total = ROUND((COALESCE(oi.quantity, 0) * COALESCE(p.cost_price, 0))::numeric, 2),
  gross_profit = ROUND((COALESCE(oi.total_amount, oi.subtotal, 0) - (COALESCE(oi.quantity, 0) * COALESCE(p.cost_price, 0)))::numeric, 2),
  gross_margin_pct = CASE
    WHEN COALESCE(oi.total_amount, oi.subtotal, 0) > 0 THEN
      ROUND(((COALESCE(oi.total_amount, oi.subtotal, 0) - (COALESCE(oi.quantity, 0) * COALESCE(p.cost_price, 0))) / COALESCE(oi.total_amount, oi.subtotal, 0) * 100)::numeric, 2)
    ELSE 0
  END
FROM public.pos_products p
WHERE oi.product_id = p.id
  AND COALESCE(oi.cost_price, 0) = 0
  AND COALESCE(p.cost_price, 0) > 0;
