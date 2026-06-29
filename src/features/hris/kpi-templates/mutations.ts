"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { kpiTemplatesQueryKeys } from "./query-keys";
import { createKpiTemplate, updateKpiTemplate, deleteKpiTemplate } from "./api";
import type { KpiTemplatePayload } from "./types";

export function useCreateKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: KpiTemplatePayload) => createKpiTemplate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: kpiTemplatesQueryKeys.all }),
  });
}

export function useUpdateKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: KpiTemplatePayload }) =>
      updateKpiTemplate(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: kpiTemplatesQueryKeys.all }),
  });
}

export function useDeleteKpiTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKpiTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: kpiTemplatesQueryKeys.all }),
  });
}
