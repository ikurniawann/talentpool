"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitTopup } from "./api";
import { topupQueryKeys } from "./query-keys";
import type { ProcessTopupPayload } from "./types";

export const useProcessTopup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProcessTopupPayload) => submitTopup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: topupQueryKeys.all });
    },
  });
};
