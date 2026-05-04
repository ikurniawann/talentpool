"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/purchasing/utils";
import { toast } from "sonner";

type StockStatus = "normal" | "warning" | "critical" | "empty";

const STATUS_COLORS: Record<StockStatus, string> = {
  normal: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  critical: "bg-orange-100 text-orange-800",
  empty: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<StockStatus, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  empty: "Empty",
};

interface InventoryRow {
  id: string;
  kode?: string;
  nama?: string;
  kategori?: string;
  lokasi_rak?: string;
  qty_in_stock: number;
  minimum_stock?: number;
  maximum_stock?: number;
  avg_unit_cost?: number;
  stock_status: StockStatus;
  satuan?: string;
}

export default function InventoryValuationPage() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`/api/purchasing/reports/inventory-valuation?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        const mappedItems = (result.data || []).map((item: any) => {
          let stockStatus: StockStatus = "normal";
          if (!item.qty_onhand || item.qty_onhand === 0) stockStatus = "empty";
          else if (item.qty_onhand <= (item.min_stock || 0) * 0.25) stockStatus = "critical";
          else if (item.qty_onhand <= (item.min_stock || 0)) stockStatus = "warning";
          return {
            id: item.id || item.raw_material_id,
            kode: item.kode,
            nama: item.nama,
            kategori: item.kategori,
            lokasi_rak: item.lokasi_rak,
            qty_in_stock: item.qty_onhand || 0,
            minimum_stock: item.min_stock,
            maximum_stock: item.max_stock,
            avg_unit_cost: item.avg_cost || 0,
            stock_status: stockStatus,
            satuan: item.satuan,
          };
        });
        setItems(mappedItems);
      }
    } catch (error) {
      console.error("Error fetching inventory valuation:", error);
      toast.error("Gagal memuat data valuasi inventori");
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      (item.kode?.toLowerCase().includes(search.toLowerCase())) ||
      (item.nama?.toLowerCase().includes(search.toLowerCase()));
    const matchKategori = kategori === "all" || item.kategori === kategori;
    return matchSearch && matchKategori;
  });

  const totalNilai = filtered.reduce((sum, i) => sum + (i.qty_in_stock * (i.avg_unit_cost || 0)), 0);
  const totalStok = filtered.reduce((sum, i) => sum + i.qty_in_stock, 0);
  const totalItems = items.length;
  const warningCount = items.filter(i => i.stock_status === "warning").length;
  const criticalCount = items.filter(i => i.stock_status === "critical" || i.stock_status === "empty").length;

  // Category breakdown
  const categoryBreakdown = filtered.reduce<Record<string, { count: number; nilai: number }>>((acc, item) => {
    const cat = item.kategori || "Lainnya";
    if (!acc[cat]) acc[cat] = { count: 0, nilai: 0 };
    acc[cat].count += 1;
    acc[cat].nilai += item.qty_in_stock * (item.avg_unit_cost || 0);
    return acc;
  }, {});

  const categoryEntries = Object.entries(categoryBreakdown).sort((a, b) => b[1].nilai - a[1].nilai);
  const maxNilai = categoryEntries.length > 0 ? Math.max(...categoryEntries.map(([, v]) => v.nilai)) : 1;

  const handleExportCSV = () => {
    const headers = ["Kode", "Nama", "Kategori", "Lokasi", "Stok", "Satuan", "Min", "Max", "Unit Cost", "Nilai Total", "Status"];
    const rows = filtered.map((item) => [
      item.kode || "",
      item.nama || "",
      item.kategori || "",
      item.lokasi_rak || "",
      String(item.qty_in_stock),
      item.satuan || "",
      String(item.minimum_stock ?? ""),
      String(item.maximum_stock ?? ""),
      String(item.avg_unit_cost ?? 0),
      String(item.qty_in_stock * (item.avg_unit_cost || 0)),
      STATUS_LABELS[item.stock_status],
    ]);

    const csvContent = [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-valuation-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diexport");
  };

  return (
    <div className="p-6">
      <BreadcrumbNav items={[
        { label: "Purchasing", href: "/dashboard/purchasing" },
        { label: "Laporan", href: "/dashboard/purchasing/reports" },
        { label: "Valuasi Inventori" },
      ]} />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Valuasi Inventori</h1>
          <p className="text-sm text-gray-500">Nilai stock per kategori bahan baku</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Date Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm w-44" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Nilai Inventori</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-pink-600">{formatRupiah(totalNilai)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Unit Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalStok.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Jumlah Item</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Status Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {warningCount > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                  {warningCount} Warning
                </Badge>
              )}
              {criticalCount > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                  {criticalCount} Critical
                </Badge>
              )}
              {warningCount === 0 && criticalCount === 0 && (
                <Badge className="bg-green-100 text-green-800">All Normal</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Chart */}
      {categoryEntries.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-4 h-4 text-pink-600" />
              Breakdown per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryEntries.map(([cat, { count, nilai }]) => {
                const pct = totalNilai > 0 ? (nilai / totalNilai) * 100 : 0;
                const barPct = maxNilai > 0 ? (nilai / maxNilai) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-600 truncate flex-shrink-0">{cat}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-pink-400 h-4 rounded-full transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-xs text-gray-500 flex-shrink-0">
                      {pct.toFixed(1)}%
                    </div>
                    <div className="w-32 text-right text-sm font-medium flex-shrink-0">
                      {formatRupiah(nilai)}
                    </div>
                    <div className="w-16 text-right text-xs text-gray-400 flex-shrink-0">
                      {count} item
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari kode, nama bahan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="Bahan Baku">Bahan Baku</SelectItem>
                <SelectItem value="Kemasan">Kemasan</SelectItem>
                <SelectItem value="Bahan Penolong">Bahan Penolong</SelectItem>
                <SelectItem value="Finished Goods">Finished Goods</SelectItem>
                <SelectItem value="Spare Part">Spare Part</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium">Kode</th>
                  <th className="text-left px-4 py-3 font-medium">Nama Bahan</th>
                  <th className="text-left px-4 py-3 font-medium">Kategori</th>
                  <th className="text-left px-4 py-3 font-medium">Lokasi</th>
                  <th className="text-right px-4 py-3 font-medium">Stok</th>
                  <th className="text-right px-4 py-3 font-medium">Min</th>
                  <th className="text-right px-4 py-3 font-medium">Max</th>
                  <th className="text-right px-4 py-3 font-medium">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium">Nilai Total</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-400">Memuat...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      <div className="flex flex-col items-center py-12 text-gray-400">
                        <CubeIcon className="w-12 h-12 mb-2" />
                        <p>Belum ada data valuasi inventori</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{item.kode || "-"}</td>
                      <td className="px-4 py-3">{item.nama || "-"}</td>
                      <td className="px-4 py-3">{item.kategori || "-"}</td>
                      <td className="px-4 py-3">{item.lokasi_rak || "-"}</td>
                      <td className="px-4 py-3 text-right">{item.qty_in_stock.toLocaleString()} {item.satuan || ""}</td>
                      <td className="px-4 py-3 text-right">{item.minimum_stock?.toLocaleString() || "-"}</td>
                      <td className="px-4 py-3 text-right">{item.maximum_stock?.toLocaleString() || "-"}</td>
                      <td className="px-4 py-3 text-right">{item.avg_unit_cost ? formatRupiah(item.avg_unit_cost) : "-"}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatRupiah(item.qty_in_stock * (item.avg_unit_cost || 0))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[item.stock_status]}>
                          {STATUS_LABELS[item.stock_status]}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
