"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { performanceQueryKeys } from "./query-keys";
import {
  createPerformanceReview,
  deletePerformanceReview,
  savePerformanceReviewEdit,
} from "./api";
import type { PerformanceReviewPayload } from "./types";

export function useCreatePerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PerformanceReviewPayload) => createPerformanceReview(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: performanceQueryKeys.all }),
  });
}

export function useDeletePerformanceReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePerformanceReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: performanceQueryKeys.all }),
  });
}

export function useSavePerformanceReviewEdit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: Parameters<typeof savePerformanceReviewEdit>[0]) =>
      savePerformanceReviewEdit(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: performanceQueryKeys.all }),
  });
}
