import { buildListUrl, apiGet } from "@/lib/api-client";
import type {
  DashboardEmployeeKpi,
  DashboardPerformanceReview,
  KpiDashboardData,
  KpiDashboardParams,
} from "./types";

export type * from "./types";

function mapReview(row: {
  id: string;
  period_label: string;
  grand_total_score?: number | null;
  overall_score?: number | null;
  status: string;
  employee_id?: string;
  employee?: { id?: string; full_name?: string; department?: { name: string } };
}): DashboardPerformanceReview {
  return {
    id: row.id,
    period_label: row.period_label,
    overall_score: row.grand_total_score ?? row.overall_score ?? null,
    status: row.status,
    employee: {
      id: row.employee?.id || row.employee_id || "",
      full_name: row.employee?.full_name || "",
      department: row.employee?.department,
    },
  };
}

export async function fetchKpiDashboardData(params: KpiDashboardParams = {}): Promise<KpiDashboardData> {
  const [kpiRes, reviewRes] = await Promise.all([
    apiGet<{ data: DashboardEmployeeKpi[] }>(
      buildListUrl("/api/hris/employee-kpis", {
        limit: 500,
        status: "active",
        period_label: params.period_label,
      })
    ),
    apiGet<{ data: unknown[] }>(
      buildListUrl("/api/hris/performance/reviews", {
        limit: 100,
        period_label: params.period_label,
      })
    ),
  ]);

  return {
    kpis: kpiRes.data ?? [],
    reviews: (reviewRes.data ?? []).map((row) => mapReview(row as Parameters<typeof mapReview>[0])),
  };
}
