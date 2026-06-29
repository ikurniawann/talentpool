"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listRewards } from "./api";
import { rewardsQueryKeys } from "./query-keys";
import type { RewardsListParams } from "./types";

export const useRewardsList = (params: RewardsListParams) =>
  useQuery({
    queryKey: rewardsQueryKeys.list(params),
    queryFn: () => listRewards(params),
    placeholderData: keepPreviousData,
  });
