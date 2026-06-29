"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PurchaseReturnFormData } from "@/types/purchasing";
import { createReturn, approveReturn, rejectReturn } from "./api";
import { returnsQueryKeys } from "./query-keys";

export const useCreateReturn = () =>
  useMutation({
    mutationFn: (data: PurchaseReturnFormData) => createReturn(data),
  });

export const useApproveReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: string; approvedBy: string }) =>
      approveReturn(id, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: returnsQueryKeys.all });
    },
  });
};

export const useRejectReturn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      rejectedBy,
    }: {
      id: string;
      reason: string;
      rejectedBy: string;
    }) => rejectReturn(id, reason, rejectedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: returnsQueryKeys.all });
    },
  });
};
