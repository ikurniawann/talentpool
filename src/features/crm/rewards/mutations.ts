"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { buildRewardPayload, deleteReward, saveReward } from "./api";
import { rewardsQueryKeys } from "./query-keys";
import type { Reward, SaveRewardPayload } from "./types";

export const useSaveReward = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveRewardPayload) => saveReward(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardsQueryKeys.all });
    },
  });
};

export const useToggleReward = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reward: Reward) =>
      saveReward(buildRewardPayload(reward, { is_active: !reward.is_active })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardsQueryKeys.all });
    },
  });
};

export const useDeleteReward = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rewardsQueryKeys.all });
    },
  });
};
