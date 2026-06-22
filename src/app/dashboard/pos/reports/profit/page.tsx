"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Download,
  Loader2,
  ReceiptText,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { convertToCSV, downloadCSV } from "@/lib/utils/csv-export";

type ProfitBucket = {
  id: string;
  label: string;
  quantity: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
};

type ProfitReport = {
  filters: {
    date_from: string;
    date_to: string;
  };
  summary: {
    orders: number;
    items: number;
    quantity: number;
    revenue: number;
    cogs: number;
    gross_profit: number;
    gross_margin_pct: number;
    zero_cost_items: number;
  };
  breakdowns: {
    products: ProfitBucket[];
    categories: ProfitBucket[];
    stations: ProfitBucket[];
    cashiers: ProfitBucket[];
    dates: ProfitBucket[];
  };
};

type ApiResponse = {
  success: boolean;
  data?: ProfitReport;
  error?: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value || 0);

const today = () => new Date().toISOString().slice(0, 10);

const firstDayOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof BarChart3;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="rounded-lg bg-pink-50 p-2 text-pink-600">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="mt-1 text-sm font-medium text-gray-500">{title}</div>
        <div className="mt-3 text-xs text-gray-400">{helper}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: ProfitBucket[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4 font-semibold">Nama</th>
              <th className="py-2 pr-4 text-right font-semibold">Qty</th>
              <th className="py-2 pr-4 text-right font-semibold">Revenue</th>
              <th className="py-2 pr-4 text-right font-semibold">COGS</th>
              <th className="py-2 pr-4 text-right font-semibold">Gross Profit</th>
              <th className="py-2 text-right font-semibold">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium text-gray-900">{row.label}</td>
                  <td className="py-3 pr-4 text-right text-gray-700">{formatNumber(row.quantity)}</td>
                  <td className="py-3 pr-4 text-right text-gray-700">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 pr-4 text-right text-gray-700">{formatCurrency(row.cogs)}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-gray-900">{formatCurrency(row.gross_profit)}</td>
                  <td className="py-3 text-right font-semibold text-pink-600">{formatNumber(row.gross_margin_pct)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  Belum ada data profit pada periode ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function POSProfitReportPage() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    return params.toString();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    async function loadReport() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/pos/reports/profit?${query}`, { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || "Gagal memuat laporan profit POS");
        }
        if (!cancelled) setReport(payload.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat laporan profit POS");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReport();
    return () => {
      cancelled = true;
    };
  }, [query, refreshKey]);

  const summary = report?.summary;

  const handleExport = () => {
    if (!report) return;

    const rows = [
      ...report.breakdowns.products.map((row) => ({ section: "Produk", ...row })),
      ...report.breakdowns.categories.map((row) => ({ section: "Kategori", ...row })),
      ...report.breakdowns.stations.map((row) => ({ section: "Station", ...row })),
      ...report.breakdowns.cashiers.map((row) => ({ section: "Kasir", ...row })),
      ...report.breakdowns.dates.map((row) => ({ section: "Tanggal", ...row })),
    ];
    const csv = convertToCSV(rows, [
      { key: "section", label: "Section" },
      { key: "label", label: "Nama" },
      { key: "quantity", label: "Qty" },
      { key: "revenue", label: "Revenue" },
      { key: "cogs", label: "COGS" },
      { key: "gross_profit", label: "Gross Profit" },
      { key: "gross_margin_pct", label: "Gross Margin %" },
    ]);

    downloadCSV(csv, `pos-profit-${report.filters.date_from}-${report.filters.date_to}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit POS</h1>
          <p className="text-sm text-gray-500">Revenue, COGS, gross profit, dan margin berdasarkan snapshot order item</p>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-end">
          <label className="space-y-1 text-xs font-semibold text-gray-600">
            Dari
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9 w-full sm:w-40" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-gray-600">
            Sampai
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9 w-full sm:w-40" />
          </label>
          <Button type="button" size="sm" variant="outline" onClick={() => { setDateFrom(today()); setDateTo(today()); }}>
            Hari Ini
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={handleExport} disabled={!report || loading}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="flex items-center justify-center gap-2 py-20 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat laporan profit...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Revenue"
              value={formatCurrency(summary?.revenue || 0)}
              helper={`${summary?.orders || 0} order paid/completed`}
              icon={WalletCards}
            />
            <MetricCard
              title="COGS"
              value={formatCurrency(summary?.cogs || 0)}
              helper={`${summary?.items || 0} item dengan snapshot`}
              icon={ReceiptText}
            />
            <MetricCard
              title="Gross Profit"
              value={formatCurrency(summary?.gross_profit || 0)}
              helper={`${formatNumber(summary?.gross_margin_pct || 0)}% gross margin`}
              icon={TrendingUp}
            />
            <MetricCard
              title="Zero Cost Items"
              value={formatNumber(summary?.zero_cost_items || 0)}
              helper="Item revenue yang cost_price-nya 0"
              icon={CalendarDays}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BreakdownTable title="Breakdown Produk" rows={report?.breakdowns.products || []} />
            <BreakdownTable title="Breakdown Kategori" rows={report?.breakdowns.categories || []} />
            <BreakdownTable title="Breakdown Station" rows={report?.breakdowns.stations || []} />
            <BreakdownTable title="Breakdown Kasir" rows={report?.breakdowns.cashiers || []} />
          </div>

          <BreakdownTable title="Trend Harian" rows={report?.breakdowns.dates || []} />
        </>
      )}
    </div>
  );
}
