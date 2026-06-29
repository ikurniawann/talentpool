"use client";

import { useQuery } from "@tanstack/react-query";
import { listPendingPRApprovals } from "./api";
import { approvalQueryKeys } from "./query-keys";

export const usePendingPRApprovals = () =>
  useQuery({
    queryKey: approvalQueryKeys.pendingPRs,
    queryFn: listPendingPRApprovals,
  });
