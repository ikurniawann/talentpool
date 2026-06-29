import type {
  CrmDashboardResult,
  CrmTier,
  CrmXpRule,
  PosProduct,
  TierConfigBundle,
  XpConfigBundle,
} from "./types";

export type * from "./types";

function toNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function parseCrmResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || fallbackError);
  }
  return json as T;
}

export async function getCrmDashboard(): Promise<CrmDashboardResult> {
  const response = await fetch("/api/crm/dashboard", { cache: "no-store" });
  const json = await parseCrmResponse<{ data: CrmDashboardResult["data"]; meta?: { schemaReady?: boolean } }>(
    response,
    "Gagal memuat dashboard CRM"
  );
  return {
    data: json.data,
    schemaReady: Boolean(json.meta?.schemaReady),
  };
}

export async function getXpConfig(): Promise<XpConfigBundle> {
  const [rulesResponse, productsResponse] = await Promise.all([
    fetch("/api/crm/xp-rules?source_channel=pos", { cache: "no-store" }),
    fetch("/api/pos/products", { cache: "no-store" }),
  ]);

  const [rulesJson, productsJson] = await Promise.all([
    parseCrmResponse<{ data: CrmXpRule[] }>(rulesResponse, "Gagal memuat rule XP"),
    parseCrmResponse<{ data: PosProduct[] }>(productsResponse, "Gagal memuat produk POS"),
  ]);

  const rules = rulesJson.data ?? [];
  const products = (productsJson.data ?? []).map((product) => ({
    ...product,
    xp: toNumber(product.xp ?? product.xp_points),
  }));
  const globalRule = rules.find((rule) => rule.code === "pos-order-amount-default");

  return {
    rules,
    products,
    productDraft: Object.fromEntries(products.map((product) => [product.id, toNumber(product.xp)])),
    globalRuleDraft: {
      xp_value: toNumber(globalRule?.xp_value ?? 2),
      amount_step: toNumber(globalRule?.amount_step ?? 10000),
      tier_multiplier_enabled: globalRule?.tier_multiplier_enabled ?? true,
    },
  };
}

export async function getTierConfig(): Promise<TierConfigBundle> {
  const response = await fetch("/api/crm/tiers", { cache: "no-store" });
  const json = await parseCrmResponse<{ data: CrmTier[] }>(response, "Gagal memuat tier CRM");

  const tiers = (json.data ?? []).map((tier) => ({
    ...tier,
    rank: toNumber(tier.rank),
    min_lifetime_xp: toNumber(tier.min_lifetime_xp),
    min_total_spend: toNumber(tier.min_total_spend),
    xp_multiplier: toNumber(tier.xp_multiplier) || 1,
    discount_percent: toNumber(tier.discount_percent),
    benefits: tier.benefits ?? [],
    display_color: tier.display_color || "#6B7280",
    is_active: tier.is_active !== false,
  }));

  return {
    tiers,
    draft: Object.fromEntries(tiers.map((tier) => [tier.code, tier])),
  };
}

export async function saveTierConfig(tier: CrmTier): Promise<void> {
  const response = await fetch("/api/crm/tiers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...tier,
      rank: Math.max(1, Math.floor(toNumber(tier.rank))),
      min_lifetime_xp: Math.max(0, Math.floor(toNumber(tier.min_lifetime_xp))),
      min_total_spend: Math.max(0, toNumber(tier.min_total_spend)),
      xp_multiplier: Math.max(0, toNumber(tier.xp_multiplier)),
      discount_percent: Math.min(100, Math.max(0, toNumber(tier.discount_percent))),
      benefits: tier.benefits ?? [],
      display_color: tier.display_color || "#6B7280",
      is_active: tier.is_active !== false,
    }),
  });
  await parseCrmResponse(response, "Gagal menyimpan tier CRM");
}

export async function saveGlobalPosRule(draft: XpConfigBundle["globalRuleDraft"]): Promise<void> {
  const response = await fetch("/api/crm/xp-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "pos-order-amount-default",
      name: "POS order amount default",
      source_channel: "pos",
      source_type: "order_amount",
      source_id: null,
      outlet_scope: "all",
      outlet_id: null,
      xp_mode: "per_amount",
      xp_value: Math.max(0, toNumber(draft.xp_value)),
      amount_step: Math.max(1, toNumber(draft.amount_step)),
      min_amount: 0,
      max_xp_per_event: null,
      tier_multiplier_enabled: draft.tier_multiplier_enabled,
      priority: 100,
      starts_at: null,
      ends_at: null,
      is_active: true,
      metadata: { description: "Default XP for paid POS transaction amount" },
    }),
  });
  await parseCrmResponse(response, "Gagal menyimpan rule XP transaksi");
}

export async function updateProductXp(productId: string, xp: number): Promise<void> {
  const response = await fetch(`/api/pos/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ xp_points: xp }),
  });
  await parseCrmResponse(response, "Gagal menyimpan XP produk");
}

export { toNumber };
