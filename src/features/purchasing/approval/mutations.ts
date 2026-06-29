"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approvePRApproval } from "./api";
import { approvalQueryKeys } from "./query-keys";

export const useApprovePRApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approvePRApproval(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalQueryKeys.pendingPRs });
    },
  });
};
