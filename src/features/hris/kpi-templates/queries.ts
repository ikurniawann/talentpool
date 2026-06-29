"use client";

import { useQuery } from "@tanstack/react-query";
import { kpiTemplatesQueryKeys } from "./query-keys";
import { fetchKpiTemplates, fetchKpiTemplate } from "./api";

export const useKpiTemplates = () =>
  useQuery({
    queryKey: kpiTemplatesQueryKeys.list(),
    queryFn: fetchKpiTemplates,
  });

export const useKpiTemplate = (id: string) =>
  useQuery({
    queryKey: kpiTemplatesQueryKeys.detail(id),
    queryFn: () => fetchKpiTemplate(id),
    enabled: !!id,
  });
