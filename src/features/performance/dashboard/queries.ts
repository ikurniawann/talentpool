"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchKpiDashboardData } from "./api";
import { kpiDashboardQueryKeys } from "./query-keys";
import type { KpiDashboardParams } from "./types";

export const useKpiDashboard = (params: KpiDashboardParams = {}) =>
  useQuery({
    queryKey: kpiDashboardQueryKeys.summary(params),
    queryFn: () => fetchKpiDashboardData(params),
  });
