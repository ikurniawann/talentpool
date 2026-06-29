"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { ReturnListParams } from "@/types/purchasing";
import { listReturnsPaged, getReturn, getReturnFormData } from "./api";
import { returnsQueryKeys } from "./query-keys";

export const useReturnList = (params: ReturnListParams) =>
  useQuery({
    queryKey: returnsQueryKeys.list(params),
    queryFn: () => listReturnsPaged(params),
    placeholderData: keepPreviousData,
  });

export const useReturn = (id: string) =>
  useQuery({
    queryKey: returnsQueryKeys.detail(id),
    queryFn: () => getReturn(id),
    enabled: !!id,
  });

export const useReturnFormData = (grnId?: string | null) =>
  useQuery({
    queryKey: returnsQueryKeys.formData(grnId),
    queryFn: () => getReturnFormData(grnId),
  });
