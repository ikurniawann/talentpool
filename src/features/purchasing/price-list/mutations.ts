"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SupplierPriceListFormData } from "@/types/purchasing";
import { createPriceList, updatePriceList, deletePriceList } from "@/lib/purchasing";
import { priceListQueryKeys } from "./query-keys";

export function useCreatePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SupplierPriceListFormData) => createPriceList(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: priceListQueryKeys.all }),
  });
}

export function useUpdatePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SupplierPriceListFormData> }) =>
      updatePriceList(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: priceListQueryKeys.all }),
  });
}

export function useDeletePriceList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePriceList(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: priceListQueryKeys.all }),
  });
}
