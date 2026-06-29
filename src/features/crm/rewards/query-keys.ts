import type { RewardsListParams } from "./types";

export const rewardsQueryKeys = {
  all: ["crm", "rewards"] as const,
  list: (params: RewardsListParams) => ["crm", "rewards", "list", params] as const,
};
