import type { KpiDashboardParams } from "./types";

export const kpiDashboardQueryKeys = {
  all: ["performance", "kpi-dashboard"] as const,
  summary: (params: KpiDashboardParams) => [...kpiDashboardQueryKeys.all, params] as const,
};
