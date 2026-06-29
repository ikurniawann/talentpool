import type { ProfitReport, ProfitReportParams } from "./types";

export type * from "./types";

export async function getProfitReport(params: ProfitReportParams): Promise<ProfitReport> {
  const sp = new URLSearchParams({
    date_from: params.date_from,
    date_to: params.date_to,
  });
  const response = await fetch(`/api/pos/reports/profit?${sp.toString()}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || "Gagal memuat laporan profit POS");
  }
  return payload.data as ProfitReport;
}
