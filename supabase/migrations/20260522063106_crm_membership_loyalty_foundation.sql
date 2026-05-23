-- CRM Membership and Loyalty foundation
-- Phase 1: membership tiers, member profiles, XP rules, ledgers, rewards,
-- collectible avatars, and partner event audit tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.crm_membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL UNIQUE,
  min_lifetime_xp INTEGER NOT NULL DEFAULT 0,
  min_total_spend NUMERIC(14, 2) NOT NULL DEFAULT 0,
  xp_multiplier NUMERIC(6, 2) NOT NULL DEFAULT 1,
  discount_percent NUMERIC(6, 2) NOT NULL DEFAULT 0,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_color TEXT NOT NULL DEFAULT '#6B7280',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_membership_tiers_rank_positive CHECK (rank > 0),
  CONSTRAINT crm_membership_tiers_min_lifetime_xp_positive CHECK (min_lifetime_xp >= 0),
  CONSTRAINT crm_membership_tiers_min_total_spend_positive CHECK (min_total_spend >= 0),
  CONSTRAINT crm_membership_tiers_xp_multiplier_positive CHECK (xp_multiplier >= 0),
  CONSTRAINT crm_membership_tiers_discount_range CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

CREATE TABLE IF NOT EXISTS public.crm_collectible_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  required_tier_id UUID NULL REFERENCES public.crm_membership_tiers(id) ON DELETE SET NULL,
  xp_cost INTEGER NOT NULL DEFAULT 0,
  stock_total INTEGER NULL,
  stock_redeemed INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_collectible_avatars_rarity_check CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'limited')),
  CONSTRAINT crm_collectible_avatars_xp_cost_positive CHECK (xp_cost >= 0),
  CONSTRAINT crm_collectible_avatars_stock_total_positive CHECK (stock_total IS NULL OR stock_total >= 0),
  CONSTRAINT crm_collectible_avatars_stock_redeemed_positive CHECK (stock_redeemed >= 0),
  CONSTRAINT crm_collectible_avatars_stock_redeemed_lte_total CHECK (stock_total IS NULL OR stock_redeemed <= stock_total)
);

CREATE TABLE IF NOT EXISTS public.crm_member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  member_code TEXT NOT NULL UNIQUE DEFAULT ('ARK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  tier_id UUID NOT NULL REFERENCES public.crm_membership_tiers(id) ON DELETE RESTRICT,
  current_xp INTEGER NOT NULL DEFAULT 0,
  lifetime_xp INTEGER NOT NULL DEFAULT 0,
  spent_xp INTEGER NOT NULL DEFAULT 0,
  loyalty_score NUMERIC(14, 2) NOT NULL DEFAULT 0,
  active_avatar_id UUID NULL REFERENCES public.crm_collectible_avatars(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_member_profiles_customer_unique UNIQUE (customer_id),
  CONSTRAINT crm_member_profiles_status_check CHECK (status IN ('active', 'inactive', 'suspended', 'merged')),
  CONSTRAINT crm_member_profiles_current_xp_positive CHECK (current_xp >= 0),
  CONSTRAINT crm_member_profiles_lifetime_xp_positive CHECK (lifetime_xp >= 0),
  CONSTRAINT crm_member_profiles_spent_xp_positive CHECK (spent_xp >= 0),
  CONSTRAINT crm_member_profiles_loyalty_score_positive CHECK (loyalty_score >= 0)
);

CREATE TABLE IF NOT EXISTS public.crm_xp_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NULL,
  outlet_scope TEXT NOT NULL DEFAULT 'all',
  outlet_id UUID NULL,
  xp_mode TEXT NOT NULL,
  xp_value NUMERIC(14, 4) NOT NULL,
  amount_step NUMERIC(14, 2) NOT NULL DEFAULT 1,
  min_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  max_xp_per_event INTEGER NULL,
  tier_multiplier_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_xp_rules_source_channel_check CHECK (source_channel IN ('pos', 'photobooth', 'studio_game', 'manual', 'campaign')),
  CONSTRAINT crm_xp_rules_outlet_scope_check CHECK (outlet_scope IN ('all', 'specific')),
  CONSTRAINT crm_xp_rules_xp_mode_check CHECK (xp_mode IN ('fixed', 'per_item', 'per_amount', 'multiplier', 'percentage')),
  CONSTRAINT crm_xp_rules_xp_value_positive CHECK (xp_value >= 0),
  CONSTRAINT crm_xp_rules_amount_step_positive CHECK (amount_step > 0),
  CONSTRAINT crm_xp_rules_min_amount_positive CHECK (min_amount >= 0),
  CONSTRAINT crm_xp_rules_max_xp_positive CHECK (max_xp_per_event IS NULL OR max_xp_per_event >= 0),
  CONSTRAINT crm_xp_rules_outlet_required CHECK (
    (outlet_scope = 'all' AND outlet_id IS NULL)
    OR (outlet_scope = 'specific' AND outlet_id IS NOT NULL)
  ),
  CONSTRAINT crm_xp_rules_date_range CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.crm_xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.crm_member_profiles(id) ON DELETE CASCADE,
  customer_id UUID NULL,
  direction TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NULL,
  outlet_id UUID NULL,
  xp_delta INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  lifetime_before INTEGER NOT NULL DEFAULT 0,
  lifetime_after INTEGER NOT NULL DEFAULT 0,
  rule_id UUID NULL REFERENCES public.crm_xp_rules(id) ON DELETE SET NULL,
  reference_table TEXT NULL,
  reference_id TEXT NULL,
  idempotency_key TEXT NULL,
  description TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_xp_ledger_direction_check CHECK (direction IN ('earn', 'spend', 'adjust', 'reverse', 'expire')),
  CONSTRAINT crm_xp_ledger_source_channel_check CHECK (source_channel IN ('pos', 'photobooth', 'studio_game', 'manual', 'campaign', 'redemption')),
  CONSTRAINT crm_xp_ledger_xp_delta_not_zero CHECK (xp_delta <> 0),
  CONSTRAINT crm_xp_ledger_balance_positive CHECK (balance_before >= 0 AND balance_after >= 0),
  CONSTRAINT crm_xp_ledger_lifetime_positive CHECK (lifetime_before >= 0 AND lifetime_after >= 0)
);

CREATE TABLE IF NOT EXISTS public.crm_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  xp_cost INTEGER NOT NULL,
  required_tier_id UUID NULL REFERENCES public.crm_membership_tiers(id) ON DELETE SET NULL,
  linked_avatar_id UUID NULL REFERENCES public.crm_collectible_avatars(id) ON DELETE SET NULL,
  stock_total INTEGER NULL,
  stock_redeemed INTEGER NOT NULL DEFAULT 0,
  max_redemptions_per_member INTEGER NULL,
  image_url TEXT NULL,
  reward_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NULL,
  ends_at TIMESTAMPTZ NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_rewards_type_check CHECK (reward_type IN ('discount', 'merchandise', 'avatar', 'voucher', 'ark_coin', 'custom')),
  CONSTRAINT crm_rewards_xp_cost_positive CHECK (xp_cost >= 0),
  CONSTRAINT crm_rewards_stock_total_positive CHECK (stock_total IS NULL OR stock_total >= 0),
  CONSTRAINT crm_rewards_stock_redeemed_positive CHECK (stock_redeemed >= 0),
  CONSTRAINT crm_rewards_stock_redeemed_lte_total CHECK (stock_total IS NULL OR stock_redeemed <= stock_total),
  CONSTRAINT crm_rewards_max_per_member_positive CHECK (max_redemptions_per_member IS NULL OR max_redemptions_per_member > 0),
  CONSTRAINT crm_rewards_date_range CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.crm_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_number TEXT NOT NULL UNIQUE DEFAULT ('RDM-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  member_id UUID NOT NULL REFERENCES public.crm_member_profiles(id) ON DELETE CASCADE,
  customer_id UUID NULL,
  reward_id UUID NOT NULL REFERENCES public.crm_rewards(id) ON DELETE RESTRICT,
  xp_cost INTEGER NOT NULL,
  xp_ledger_id UUID NULL REFERENCES public.crm_xp_ledger(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  voucher_code TEXT NULL UNIQUE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ NULL,
  fulfilled_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_redemptions_status_check CHECK (status IN ('pending', 'approved', 'fulfilled', 'cancelled', 'expired')),
  CONSTRAINT crm_redemptions_xp_cost_positive CHECK (xp_cost >= 0)
);

CREATE TABLE IF NOT EXISTS public.crm_member_avatar_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.crm_member_profiles(id) ON DELETE CASCADE,
  avatar_id UUID NOT NULL REFERENCES public.crm_collectible_avatars(id) ON DELETE CASCADE,
  redemption_id UUID NULL REFERENCES public.crm_redemptions(id) ON DELETE SET NULL,
  acquisition_source TEXT NOT NULL DEFAULT 'redemption',
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_member_avatar_inventory_unique UNIQUE (member_id, avatar_id),
  CONSTRAINT crm_member_avatar_inventory_source_check CHECK (acquisition_source IN ('redemption', 'campaign', 'manual', 'migration', 'partner'))
);

CREATE TABLE IF NOT EXISTS public.crm_integration_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  secret_hash TEXT NULL,
  webhook_url TEXT NULL,
  allowed_event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_integration_partners_type_check CHECK (partner_type IN ('photobooth', 'studio_game', 'other'))
);

CREATE TABLE IF NOT EXISTS public.crm_external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.crm_integration_partners(id) ON DELETE RESTRICT,
  external_event_id TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  customer_id UUID NULL,
  member_id UUID NULL REFERENCES public.crm_member_profiles(id) ON DELETE SET NULL,
  customer_identifier TEXT NULL,
  outlet_id UUID NULL,
  xp_rule_id UUID NULL REFERENCES public.crm_xp_rules(id) ON DELETE SET NULL,
  xp_ledger_id UUID NULL REFERENCES public.crm_xp_ledger(id) ON DELETE SET NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_external_events_partner_event_unique UNIQUE (partner_id, external_event_id),
  CONSTRAINT crm_external_events_source_channel_check CHECK (source_channel IN ('photobooth', 'studio_game')),
  CONSTRAINT crm_external_events_status_check CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored'))
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_xp_ledger_idempotency_key_idx
  ON public.crm_xp_ledger (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS crm_membership_tiers_active_rank_idx ON public.crm_membership_tiers (is_active, rank);
CREATE INDEX IF NOT EXISTS crm_collectible_avatars_active_rarity_idx ON public.crm_collectible_avatars (is_active, rarity);
CREATE INDEX IF NOT EXISTS crm_collectible_avatars_required_tier_idx ON public.crm_collectible_avatars (required_tier_id);
CREATE INDEX IF NOT EXISTS crm_member_profiles_customer_idx ON public.crm_member_profiles (customer_id);
CREATE INDEX IF NOT EXISTS crm_member_profiles_tier_status_idx ON public.crm_member_profiles (tier_id, status);
CREATE INDEX IF NOT EXISTS crm_member_profiles_lifetime_xp_idx ON public.crm_member_profiles (lifetime_xp DESC);
CREATE INDEX IF NOT EXISTS crm_xp_rules_match_idx ON public.crm_xp_rules (source_channel, source_type, source_id, outlet_scope, outlet_id, is_active, priority);
CREATE INDEX IF NOT EXISTS crm_xp_rules_active_window_idx ON public.crm_xp_rules (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS crm_xp_ledger_member_created_idx ON public.crm_xp_ledger (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_xp_ledger_customer_created_idx ON public.crm_xp_ledger (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_xp_ledger_source_reference_idx ON public.crm_xp_ledger (source_channel, source_type, reference_table, reference_id);
CREATE INDEX IF NOT EXISTS crm_rewards_active_type_idx ON public.crm_rewards (is_active, reward_type);
CREATE INDEX IF NOT EXISTS crm_rewards_required_tier_idx ON public.crm_rewards (required_tier_id);
CREATE INDEX IF NOT EXISTS crm_redemptions_member_status_idx ON public.crm_redemptions (member_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS crm_redemptions_reward_idx ON public.crm_redemptions (reward_id);
CREATE INDEX IF NOT EXISTS crm_member_avatar_inventory_member_idx ON public.crm_member_avatar_inventory (member_id);
CREATE INDEX IF NOT EXISTS crm_member_avatar_inventory_avatar_idx ON public.crm_member_avatar_inventory (avatar_id);
CREATE INDEX IF NOT EXISTS crm_integration_partners_active_type_idx ON public.crm_integration_partners (is_active, partner_type);
CREATE INDEX IF NOT EXISTS crm_external_events_partner_status_idx ON public.crm_external_events (partner_id, processing_status, received_at DESC);
CREATE INDEX IF NOT EXISTS crm_external_events_member_idx ON public.crm_external_events (member_id);
CREATE INDEX IF NOT EXISTS crm_external_events_customer_identifier_idx ON public.crm_external_events (customer_identifier);

DO $$
BEGIN
  IF to_regclass('public.pos_customers') IS NOT NULL THEN
    ALTER TABLE public.crm_member_profiles
      ADD CONSTRAINT crm_member_profiles_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.pos_customers(id) ON DELETE CASCADE;

    ALTER TABLE public.crm_xp_ledger
      ADD CONSTRAINT crm_xp_ledger_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.pos_customers(id) ON DELETE SET NULL;

    ALTER TABLE public.crm_redemptions
      ADD CONSTRAINT crm_redemptions_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.pos_customers(id) ON DELETE SET NULL;

    ALTER TABLE public.crm_external_events
      ADD CONSTRAINT crm_external_events_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.pos_customers(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_membership_tiers_set_updated_at ON public.crm_membership_tiers;
CREATE TRIGGER crm_membership_tiers_set_updated_at
  BEFORE UPDATE ON public.crm_membership_tiers
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS crm_collectible_avatars_set_updated_at ON public.crm_collectible_avatars;
CREATE TRIGGER crm_collectible_avatars_set_updated_at
  BEFORE UPDATE ON public.crm_collectible_avatars
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS crm_member_profiles_set_updated_at ON public.crm_member_profiles;
CREATE TRIGGER crm_member_profiles_set_updated_at
  BEFORE UPDATE ON public.crm_member_profiles
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS crm_xp_rules_set_updated_at ON public.crm_xp_rules;
CREATE TRIGGER crm_xp_rules_set_updated_at
  BEFORE UPDATE ON public.crm_xp_rules
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS crm_rewards_set_updated_at ON public.crm_rewards;
CREATE TRIGGER crm_rewards_set_updated_at
  BEFORE UPDATE ON public.crm_rewards
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS crm_redemptions_set_updated_at ON public.crm_redemptions;
CREATE TRIGGER crm_redemptions_set_updated_at
  BEFORE UPDATE ON public.crm_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS crm_integration_partners_set_updated_at ON public.crm_integration_partners;
CREATE TRIGGER crm_integration_partners_set_updated_at
  BEFORE UPDATE ON public.crm_integration_partners
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

DROP TRIGGER IF EXISTS crm_external_events_set_updated_at ON public.crm_external_events;
CREATE TRIGGER crm_external_events_set_updated_at
  BEFORE UPDATE ON public.crm_external_events
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

INSERT INTO public.crm_membership_tiers (
  code,
  name,
  rank,
  min_lifetime_xp,
  min_total_spend,
  xp_multiplier,
  discount_percent,
  benefits,
  display_color
) VALUES
  ('bronze', 'Bronze', 1, 0, 0, 1.00, 0, '["Basic XP earning", "Basic reward catalog"]'::jsonb, '#B7791F'),
  ('silver', 'Silver', 2, 10000, 2000000, 1.20, 5, '["1.2x XP multiplier", "Selected avatar access", "5% selected discount"]'::jsonb, '#94A3B8'),
  ('gold', 'Gold', 3, 30000, 7000000, 1.50, 10, '["1.5x XP multiplier", "Exclusive avatar access", "10% selected discount"]'::jsonb, '#F59E0B')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  rank = EXCLUDED.rank,
  min_lifetime_xp = EXCLUDED.min_lifetime_xp,
  min_total_spend = EXCLUDED.min_total_spend,
  xp_multiplier = EXCLUDED.xp_multiplier,
  discount_percent = EXCLUDED.discount_percent,
  benefits = EXCLUDED.benefits,
  display_color = EXCLUDED.display_color,
  is_active = true,
  updated_at = now();

INSERT INTO public.crm_xp_rules (
  code,
  name,
  source_channel,
  source_type,
  source_id,
  outlet_scope,
  xp_mode,
  xp_value,
  amount_step,
  min_amount,
  max_xp_per_event,
  tier_multiplier_enabled,
  priority,
  metadata
) VALUES
  (
    'pos-order-amount-default',
    'POS order amount default',
    'pos',
    'order_amount',
    NULL,
    'all',
    'per_amount',
    2,
    10000,
    0,
    NULL,
    true,
    100,
    '{"description":"2 XP per 10000 IDR paid transaction value"}'::jsonb
  ),
  (
    'photobooth-purchase-default',
    'Photobooth purchase default',
    'photobooth',
    'purchase',
    NULL,
    'all',
    'fixed',
    50,
    1,
    0,
    NULL,
    true,
    100,
    '{"description":"Default XP for completed photobooth purchase"}'::jsonb
  ),
  (
    'studio-game-play-default',
    'Studio Games play default',
    'studio_game',
    'game_play',
    NULL,
    'all',
    'fixed',
    10,
    1,
    0,
    NULL,
    true,
    100,
    '{"description":"Default XP for playing an integrated Studio Games session"}'::jsonb
  ),
  (
    'studio-game-stage-clear-default',
    'Studio Games stage clear default',
    'studio_game',
    'stage_clear',
    NULL,
    'all',
    'fixed',
    75,
    1,
    0,
    NULL,
    true,
    90,
    '{"description":"Default XP for clearing a configured game stage"}'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  source_channel = EXCLUDED.source_channel,
  source_type = EXCLUDED.source_type,
  source_id = EXCLUDED.source_id,
  outlet_scope = EXCLUDED.outlet_scope,
  xp_mode = EXCLUDED.xp_mode,
  xp_value = EXCLUDED.xp_value,
  amount_step = EXCLUDED.amount_step,
  min_amount = EXCLUDED.min_amount,
  max_xp_per_event = EXCLUDED.max_xp_per_event,
  tier_multiplier_enabled = EXCLUDED.tier_multiplier_enabled,
  priority = EXCLUDED.priority,
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = now();

ALTER TABLE public.crm_membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_collectible_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_xp_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_member_avatar_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_integration_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_external_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_manage_crm_membership_tiers"
  ON public.crm_membership_tiers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_membership_tiers"
  ON public.crm_membership_tiers FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_collectible_avatars"
  ON public.crm_collectible_avatars FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_collectible_avatars"
  ON public.crm_collectible_avatars FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_member_profiles"
  ON public.crm_member_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_member_profiles"
  ON public.crm_member_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_xp_rules"
  ON public.crm_xp_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_xp_rules"
  ON public.crm_xp_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_xp_ledger"
  ON public.crm_xp_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_xp_ledger"
  ON public.crm_xp_ledger FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_rewards"
  ON public.crm_rewards FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_rewards"
  ON public.crm_rewards FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_redemptions"
  ON public.crm_redemptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_redemptions"
  ON public.crm_redemptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_member_avatar_inventory"
  ON public.crm_member_avatar_inventory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_member_avatar_inventory"
  ON public.crm_member_avatar_inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_integration_partners"
  ON public.crm_integration_partners FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_integration_partners"
  ON public.crm_integration_partners FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_role_manage_crm_external_events"
  ON public.crm_external_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_read_crm_external_events"
  ON public.crm_external_events FOR SELECT TO authenticated USING (true);

REVOKE ALL ON TABLE public.crm_membership_tiers FROM anon;
REVOKE ALL ON TABLE public.crm_collectible_avatars FROM anon;
REVOKE ALL ON TABLE public.crm_member_profiles FROM anon;
REVOKE ALL ON TABLE public.crm_xp_rules FROM anon;
REVOKE ALL ON TABLE public.crm_xp_ledger FROM anon;
REVOKE ALL ON TABLE public.crm_rewards FROM anon;
REVOKE ALL ON TABLE public.crm_redemptions FROM anon;
REVOKE ALL ON TABLE public.crm_member_avatar_inventory FROM anon;
REVOKE ALL ON TABLE public.crm_integration_partners FROM anon;
REVOKE ALL ON TABLE public.crm_external_events FROM anon;

GRANT SELECT ON TABLE
  public.crm_membership_tiers,
  public.crm_collectible_avatars,
  public.crm_member_profiles,
  public.crm_xp_rules,
  public.crm_xp_ledger,
  public.crm_rewards,
  public.crm_redemptions,
  public.crm_member_avatar_inventory,
  public.crm_integration_partners,
  public.crm_external_events
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.crm_membership_tiers,
  public.crm_collectible_avatars,
  public.crm_member_profiles,
  public.crm_xp_rules,
  public.crm_xp_ledger,
  public.crm_rewards,
  public.crm_redemptions,
  public.crm_member_avatar_inventory,
  public.crm_integration_partners,
  public.crm_external_events
TO service_role;

REVOKE ALL ON FUNCTION public.crm_set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_set_updated_at() TO authenticated, service_role;

COMMENT ON TABLE public.crm_member_profiles IS 'CRM membership profile layer linked to POS customers.';
COMMENT ON TABLE public.crm_xp_rules IS 'Configurable XP earning rules for POS, photobooth, studio games, manual, and campaign events.';
COMMENT ON TABLE public.crm_xp_ledger IS 'Immutable source of truth for member XP balance changes.';
COMMENT ON TABLE public.crm_external_events IS 'Idempotent audit table for partner events such as photobooth purchases and Studio Games activity.';
COMMENT ON COLUMN public.crm_xp_rules.source_id IS 'Flexible text source ID: POS product UUID, partner package ID, game ID, stage ID, or NULL for global rule.';
COMMENT ON COLUMN public.crm_xp_rules.outlet_id IS 'Outlet UUID when outlet_scope is specific. Kept nullable because outlet master schema is not yet finalized.';
COMMENT ON COLUMN public.crm_xp_ledger.idempotency_key IS 'Unique event key used to prevent duplicate XP posting from POS or partner integrations.';
