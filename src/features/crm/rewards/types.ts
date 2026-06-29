export type Tier = {
  id: string;
  code: string;
  name: string;
  rank: number;
};

export type Reward = {
  id: string;
  code: string;
  name: string;
  reward_type: "discount" | "merchandise" | "avatar" | "voucher" | "ark_coin" | "custom";
  xp_cost: number;
  required_tier_id: string | null;
  required_tier?: Pick<Tier, "code" | "name" | "rank"> | null;
  stock_total: number | null;
  stock_redeemed: number;
  max_redemptions_per_member: number | null;
  image_url: string | null;
  reward_data: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

export interface RewardsListParams {
  reward_type?: string;
}

export interface RewardsListResult {
  rewards: Reward[];
  tiers: Tier[];
}

export interface SaveRewardPayload {
  code: string;
  name: string;
  reward_type: Reward["reward_type"];
  xp_cost: number;
  required_tier_id: string | null;
  linked_avatar_id: string | null;
  stock_total: number | null;
  stock_redeemed: number;
  max_redemptions_per_member: number | null;
  image_url: string | null;
  reward_data: Record<string, unknown>;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export type RewardForm = {
  id: string;
  code: string;
  name: string;
  reward_type: Reward["reward_type"];
  xp_cost: number;
  required_tier_id: string;
  stock_total: string;
  stock_redeemed: number;
  max_redemptions_per_member: string;
  is_active: boolean;
};
