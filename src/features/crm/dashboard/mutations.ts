"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveGlobalPosRule, saveTierConfig, updateProductXp } from "./api";
import { dashboardQueryKeys } from "./query-keys";
import type { CrmTier, XpConfigBundle } from "./types";

export const useSaveTierConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tier: CrmTier) => saveTierConfig(tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
    },
  });
};

export const useSaveGlobalPosRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: XpConfigBundle["globalRuleDraft"]) => saveGlobalPosRule(draft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all });
    },
  });
};

export const useUpdateProductXp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, xp }: { productId: string; xp: number }) =>
      updateProductXp(productId, xp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.xpConfig() });
    },
  });
};
