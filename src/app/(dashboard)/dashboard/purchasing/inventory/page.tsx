"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  CubeIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/purchasing/utils";

type StockStatus = "normal" | "warning" | "critical" | "empty";

const STATUS_COLORS: Record<StockStatus, string> = {
  normal: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  critical: "bg-orange-100 text-orange-800",
  empty: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<StockStatus, string> = {
  normal: "Normal",
  warning: "Hampir Habis",
  critical: "Kritis",
  empty: "Kosong",
};

interface InventoryRow {
  id: string;
  bahan_baku_id: string;
  kode?: string;
  nama?: string;
  kategori?: string;
  qty_in_stock: number;
  satuan?: string;
  lokasi_rak?: string;
  minimum_stock?: number;
  maximum_stock?: number;
  stock_status: StockStatus;
  avg_unit_cost?: number;
}

const KATEGORI_OPTIONS = [
  "Bahan Baku",
  "Kemasan",
  "Bahan Penolong",
  "Finished Goods",
  "Spare Part",
];

export default function InventoryListPage() {
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchInventory();
  }, [page, kategori, statusFilter]);

  async function fetchInventory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (kategori !== "all") params.append("kategori", kategori);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/purchasing/inventory?${params}`);
      const data = await res.json();
      if (data.data) {
        setItems(data.data);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Inventori" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventori</h1>
          <p className="text-sm text-gray-500">Stok &amp; nilai inventori bahan baku</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari kode, nama bahan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={kategori} onValueChange={(v) => { setKategori(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {KATEGORI_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="warning">Hampir Habis</SelectItem>
              <SelectItem value="critical">Kritis</SelectItem>
              <SelectItem value="empty">Kosong</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CubeIcon className="w-5 h-5" />
            Daftar Inventori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Kode", "Nama Bahan", "Kategori", "Lokasi", "Stok", "Min", "Max", "Unit Cost", "Nilai Total", "Status"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400">Memuat...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">
                      <CubeIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Belum ada data inventori
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const stockPct = item.maximum_stock
                      ? (item.qty_in_stock / item.maximum_stock) * 100
                      : 100;
                    const isLow = item.qty_in_stock <= (item.minimum_stock || 0);
                    const isHigh = stockPct >= 90;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-mono">{item.kode || item.bahan_baku_id.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-sm font-medium">{item.nama || "—"}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{item.kategori || "—"}</td>
                        <td className="py-3 px-4 text-sm">{item.lokasi_rak || "—"}</td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-1">
                            {isLow ? (
                              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500" />
                            ) : isHigh ? (
                              <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-green-500" />
                            ) : null}
                            <span className="font-medium">{item.qty_in_stock}</span>
                            <span className="text-gray-400 text-xs">{item.satuan || ""}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">{item.minimum_stock ?? "—"}</td>
                        <td className="py-3 px-4 text-sm text-gray-400">{item.maximum_stock ?? "—"}</td>
                        <td className="py-3 px-4 text-sm">{item.avg_unit_cost ? formatRupiah(item.avg_unit_cost) : "—"}</td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {item.avg_unit_cost
                            ? formatRupiah(item.qty_in_stock * item.avg_unit_cost)
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.stock_status]}`}>
                            {STATUS_LABELS[item.stock_status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</Button>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
