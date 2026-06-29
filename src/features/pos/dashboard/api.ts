import { getDashboardStats } from "@/lib/pos-api";
import type { DashboardBundle, DashboardPeriod } from "./types";

export type * from "./types";

export async function getPosDashboard(period: DashboardPeriod = "today"): Promise<DashboardBundle> {
  const res = await getDashboardStats(period);
  if (!res.success || !res.data) {
    throw new Error((res as { error?: string }).error || "Gagal memuat data dashboard");
  }

  const data = res.data as DashboardBundle;
  return {
    stats: data.stats ?? null,
    topProducts: data.topProducts ?? [],
    lowStock: data.lowStock ?? [],
    recentOrders: data.recentOrders ?? [],
  };
}
