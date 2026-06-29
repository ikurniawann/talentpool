import type {
  HPPRow,
  InventoryApiRow,
  InventoryValuationParams,
  PODetailParams,
  POSummaryParams,
  POSummaryResult,
  PoSummaryExportFormat,
  PoSummaryExportResult,
  StockCardParams,
  StockCardResponse,
  SupplierPerfRow,
} from "./types";

export type * from "./types";

const BASE = "/api/purchasing/reports";

function buildParams(record: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(record).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== null) {
      params.set(key, String(value));
    }
  });
  return params;
}

export async function getSupplierPerformance(params: {
  date_from?: string;
  date_to?: string;
}): Promise<SupplierPerfRow[]> {
  const sp = buildParams({ date_from: params.date_from, date_to: params.date_to });
  const res = await fetch(`${BASE}/supplier-performance?${sp.toString()}`);
  if (!res.ok) throw new Error("Gagal memuat data performa supplier");
  const data = await res.json();
  return data.data?.vendors ?? data.data?.summary ?? data.items ?? [];
}

export async function getHppBreakdown(): Promise<HPPRow[]> {
  const res = await fetch(`${BASE}/hpp-breakdown`);
  if (!res.ok) throw new Error("Gagal memuat data HPP");
  const data = await res.json();
  return data.items || [];
}

export async function getPoSummary(
  params: POSummaryParams
): Promise<POSummaryResult> {
  const sp = buildParams({ ...params });
  const response = await fetch(`${BASE}/po-summary?${sp.toString()}`);
  const result = await response.json();
  if (!result.success) {
    throw new Error("Gagal memuat laporan PO Summary");
  }
  return {
    summary: result.data.summary || [],
    byStatus: result.data.by_status || [],
    grandTotal: result.data.grand_total || 0,
  };
}

export async function exportPoSummary(
  params: POSummaryParams,
  format: PoSummaryExportFormat
): Promise<PoSummaryExportResult> {
  const sp = buildParams({ ...params, export: format });
  const response = await fetch(`${BASE}/po-summary?${sp.toString()}`);
  if (format === "csv") {
    return { blob: await response.blob(), extension: "csv" };
  }
  const result = await response.json();
  return {
    blob: new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    }),
    extension: "json",
  };
}

export async function getStockCard(
  params: StockCardParams
): Promise<StockCardResponse> {
  const sp = buildParams({ ...params, limit: params.limit ?? 500 });
  const response = await fetch(`${BASE}/stock-card?${sp.toString()}`);
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Gagal memuat stock card");
  }
  return result.data;
}

export async function getInventoryValuation(
  params: InventoryValuationParams
): Promise<InventoryApiRow[]> {
  const sp = buildParams({ date_from: params.date_from, date_to: params.date_to });
  const res = await fetch(`${BASE}/inventory-valuation?${sp.toString()}`);
  if (!res.ok) throw new Error("Gagal memuat valuasi inventory");
  const result = await res.json();
  return (result.data || []) as InventoryApiRow[];
}

export async function getPoDetailReport(
  params: PODetailParams
): Promise<unknown[]> {
  const sp = buildParams({ ...params });
  const response = await fetch(`${BASE}/po-detail?${sp.toString()}`);
  const result = await response.json();
  if (!result.success) {
    throw new Error("Gagal memuat laporan Detail PO");
  }
  return result.data.summary || [];
}
