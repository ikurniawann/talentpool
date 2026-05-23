-- CRM Phase 2: POS product XP integration support.

ALTER TABLE IF EXISTS public.pos_products
  ADD COLUMN IF NOT EXISTS xp_points INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF to_regclass('public.pos_products') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'pos_products_xp_points_positive'
        AND conrelid = 'public.pos_products'::regclass
    )
  THEN
    ALTER TABLE public.pos_products
      ADD CONSTRAINT pos_products_xp_points_positive CHECK (xp_points >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.pos_products') IS NOT NULL THEN
    COMMENT ON COLUMN public.pos_products.xp_points IS 'Default product XP used by CRM loyalty engine when no crm_xp_rules product override exists.';
  END IF;
END $$;
