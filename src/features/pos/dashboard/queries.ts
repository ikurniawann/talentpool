"use client";

import { useQuery } from "@tanstack/react-query";
import { getPosDashboard } from "./api";
import { dashboardQueryKeys } from "./query-keys";
import type { DashboardPeriod } from "./types";

export const usePosDashboard = (period: DashboardPeriod) =>
  useQuery({
    queryKey: dashboardQueryKeys.summary(period),
    queryFn: () => getPosDashboard(period),
  });
