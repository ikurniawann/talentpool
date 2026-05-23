-- POS KDS station mapping and item preparation workflow.
-- Station lives on products as the source of truth, then gets copied to each
-- order item so historical tickets keep their original routing.

ALTER TABLE public.pos_products
  ADD COLUMN IF NOT EXISTS station TEXT NOT NULL DEFAULT 'kitchen';

ALTER TABLE public.pos_order_items
  ADD COLUMN IF NOT EXISTS station TEXT,
  ADD COLUMN IF NOT EXISTS kitchen_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS kitchen_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kitchen_ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;

ALTER TABLE public.pos_orders
  ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ;

UPDATE public.pos_products
SET station = CASE
  WHEN name ~* '(kopi|coffee|tea|teh|minuman|drink|juice|jus|soda|latte|cappuccino|mocktail|milkshake)' THEN 'bar'
  WHEN name ~* '(roti|bread|pastry|cake|kue|croissant|donut|dessert|ice cream|gelato)' THEN 'bakery'
  ELSE 'kitchen'
END
WHERE station IS NULL OR station = 'kitchen';

UPDATE public.pos_order_items oi
SET station = COALESCE(
  oi.station,
  p.station,
  CASE
    WHEN oi.kitchen_notes ~* '(bar|drink|minuman)' OR oi.product_name ~* '(kopi|coffee|tea|teh|minuman|drink|juice|jus|soda|latte|cappuccino|mocktail|milkshake)' THEN 'bar'
    WHEN oi.kitchen_notes ~* '(bakery|dessert)' OR oi.product_name ~* '(roti|bread|pastry|cake|kue|croissant|donut|dessert|ice cream|gelato)' THEN 'bakery'
    ELSE 'kitchen'
  END
)
FROM public.pos_products p
WHERE oi.product_id = p.id
  AND oi.station IS NULL;

UPDATE public.pos_order_items
SET station = CASE
  WHEN kitchen_notes ~* '(bar|drink|minuman)' OR product_name ~* '(kopi|coffee|tea|teh|minuman|drink|juice|jus|soda|latte|cappuccino|mocktail|milkshake)' THEN 'bar'
  WHEN kitchen_notes ~* '(bakery|dessert)' OR product_name ~* '(roti|bread|pastry|cake|kue|croissant|donut|dessert|ice cream|gelato)' THEN 'bakery'
  ELSE 'kitchen'
END
WHERE station IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_products_station_check'
  ) THEN
    ALTER TABLE public.pos_products
      ADD CONSTRAINT pos_products_station_check
      CHECK (station IN ('kitchen', 'bar', 'bakery', 'dessert', 'merchandise', 'photobooth'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_order_items_station_check'
  ) THEN
    ALTER TABLE public.pos_order_items
      ADD CONSTRAINT pos_order_items_station_check
      CHECK (station IN ('kitchen', 'bar', 'bakery', 'dessert', 'merchandise', 'photobooth'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pos_order_items_kitchen_status_check'
  ) THEN
    ALTER TABLE public.pos_order_items
      ADD CONSTRAINT pos_order_items_kitchen_status_check
      CHECK (kitchen_status IN ('pending', 'preparing', 'ready', 'served', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS pos_products_station_idx
  ON public.pos_products (station);

CREATE INDEX IF NOT EXISTS pos_order_items_station_status_idx
  ON public.pos_order_items (station, kitchen_status);
