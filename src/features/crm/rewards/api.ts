import type { Reward, RewardsListParams, RewardsListResult, SaveRewardPayload } from "./types";

export type * from "./types";

async function parseCrmResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || fallbackError);
  }
  return json as T;
}

export function buildRewardPayload(reward: Reward, overrides: Partial<Reward> = {}): SaveRewardPayload {
  const next = { ...reward, ...overrides };
  return {
    code: next.code,
    name: next.name,
    reward_type: next.reward_type,
    xp_cost: Math.max(0, Number(next.xp_cost) || 0),
    required_tier_id: next.required_tier_id || null,
    linked_avatar_id: null,
    stock_total: next.stock_total == null ? null : Math.max(0, Number(next.stock_total) || 0),
    stock_redeemed: Math.max(0, Number(next.stock_redeemed) || 0),
    max_redemptions_per_member: next.max_redemptions_per_member == null
      ? null
      : Math.max(1, Number(next.max_redemptions_per_member) || 1),
    image_url: next.image_url || null,
    reward_data: next.reward_data ?? {},
    starts_at: null,
    ends_at: null,
    is_active: next.is_active,
  };
}

export async function listRewards(params: RewardsListParams = {}): Promise<RewardsListResult> {
  const sp = new URLSearchParams();
  if (params.reward_type && params.reward_type !== "all") {
    sp.set("reward_type", params.reward_type);
  }

  const [rewardsResponse, tiersResponse] = await Promise.all([
    fetch(`/api/crm/rewards${sp.toString() ? `?${sp.toString()}` : ""}`, { cache: "no-store" }),
    fetch("/api/crm/tiers", { cache: "no-store" }),
  ]);

  const [rewardsJson, tiersJson] = await Promise.all([
    parseCrmResponse<{ data: Reward[] }>(rewardsResponse, "Gagal memuat rewards"),
    parseCrmResponse<{ data: RewardsListResult["tiers"] }>(tiersResponse, "Gagal memuat tiers"),
  ]);

  return {
    rewards: rewardsJson.data ?? [],
    tiers: tiersJson.data ?? [],
  };
}

export async function saveReward(payload: SaveRewardPayload): Promise<void> {
  const response = await fetch("/api/crm/rewards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await parseCrmResponse(response, "Gagal menyimpan reward");
}

export async function deleteReward(id: string): Promise<void> {
  const response = await fetch(`/api/crm/rewards?id=${id}`, { method: "DELETE" });
  await parseCrmResponse(response, "Gagal hapus reward");
}
