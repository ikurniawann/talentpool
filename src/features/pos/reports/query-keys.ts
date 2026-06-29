import type { ProfitReportParams } from "./types";

export const reportsQueryKeys = {
  all: ["pos", "reports"] as const,
  profit: (params: ProfitReportParams) => ["pos", "reports", "profit", params] as const,
};
