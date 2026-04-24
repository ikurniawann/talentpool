"use client";

import Link from "next/link";
import { useState } from "react";
import { usePurchasingDashboard } from "@/modules/purchasing/hooks/usePurchasingDashboard";
import {
  KPICards,
  TrendChart,
  ActionPOPanel,
  StockAlertPanel,
  HPPTrendPanel,
  SupplierPerfChart,
} from "@/modules/purchasing/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { RefreshCw, Building2, Package, ShoppingCart, Truck, Archive, ArrowUturnLeft, Calendar } from "lucide-react";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              <div className="h-7 w-16 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm h-80 bg-gray-100" />
        <Card className="border-0 shadow-sm h-80 bg-gray-100" />
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-red-500 font-medium">Gagal memuat dashboard</p>
      <p className="text-sm text-gray-400 mt-1">{error}</p>
    </div>
  );
}

export default function PurchasingDashboardPage() {
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const { data, isLoading, isError, error, refetch, isFetching } = usePurchasingDashboard(
    dateRange.start || undefined,
    dateRange.end || undefined
  );

  const quickLinks = [
    { href: "/dashboard/purchasing/suppliers", label: "Supplier", icon: Building2, color: "text-pink-600 bg-pink-50 hover:bg-pink-100" },
    { href: "/dashboard/purchasing/raw-materials", label: "Bahan Baku", icon: Package, color: "text-green-600 bg-green-50 hover:bg-green-100" },
    { href: "/dashboard/purchasing/purchase-orders", label: "Purchase Order", icon: ShoppingCart, color: "text-purple-600 bg-purple-50 hover:bg-purple-100" },
    { href: "/dashboard/purchasing/grn", label: "Penerimaan", icon: Truck, color: "text-orange-600 bg-orange-50 hover:bg-orange-100" },
    { href: "/dashboard/inventory", label: "Inventory", icon: Archive, color: "text-teal-600 bg-teal-50 hover:bg-teal-100" },
    { href: "/dashboard/inventory/low-stock", label: "Low Stock", icon: Archive, color: "text-red-600 bg-red-50 hover:bg-red-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Purchasing</h1>
            <p className="text-sm text-gray-500">
              Ringkasan performa procurement & supply chain
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Date Range Filter */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">
                  Tanggal Mulai
                </label>
                <DatePicker
                  value={dateRange.start}
                  onChange={(v) => setDateRange({ ...dateRange, start: v })}
                  placeholder="Dari..."
                />
              </div>
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">
                  Tanggal Akhir
                </label>
                <DatePicker
                  value={dateRange.end}
                  onChange={(v) => setDateRange({ ...dateRange, end: v })}
                  placeholder="Sampai..."
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ start: "", end: "" })}
                  disabled={!dateRange.start && !dateRange.end}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? "Loading..." : "Terapkan Filter"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Links */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">🚀 Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <div className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${link.color}`}>
                  <link.icon className="w-8 h-8 mb-2" />
                  <span className="text-sm font-medium text-center">{link.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <DashboardSkeleton />
      ) : isError ? (
        <ErrorState error={error?.message ?? "Unknown error"} />
      ) : data ? (
        <>
          {/* Widget 1: KPI Cards */}
          <KPICards kpis={data.kpis} />

          {/* Widget 2 & 5: Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart data={data.monthlyTrends} />
            <HPPTrendPanel trends={data.hppTrends} />
          </div>

          {/* Widget 3 & 4: Action PO + Stock Alert */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActionPOPanel pos={data.actionPOs} />
            <StockAlertPanel alerts={data.stockAlerts} />
          </div>

          {/* Widget 6: Supplier Performance */}
          <SupplierPerfChart suppliers={data.supplierPerformance} />
        </>
      ) : null}
    </div>
  );
}
