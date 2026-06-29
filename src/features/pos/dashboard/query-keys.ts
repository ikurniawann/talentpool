import type { DashboardPeriod } from "./types";

export const dashboardQueryKeys = {
  all: ["pos", "dashboard"] as const,
  summary: (period: DashboardPeriod) => ["pos", "dashboard", "summary", period] as const,
};
