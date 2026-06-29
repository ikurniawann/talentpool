"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { formatRupiah, formatDate } from "@/lib/purchasing/utils";
import {
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useProductStock } from "../queries";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "in_stock", label: "Tersedia" },
  { value: "out_of_stock", label: "Habis" },
];

function formatQty(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );
}

export function ProductStockTab() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const listQuery = useProductStock({
    page,
    limit,
    status: statusFilter,
    search: appliedSearch || undefined,
  });

  const items = listQuery.data?.items ?? [];
  const loading = listQuery.isLoading;
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const summary = useMemo(() => {
    const out = items.filter((i) => (Number(i.qty_available) || 0) <= 0).length;
    const totalValue = items.reduce(
      (s, i) => s + (Number(i.total_value) || 0),
      0
    );
    return { out, totalValue };
  }, [items]);

  const applySearch = () => {
    setPage(1);
    setAppliedSearch(search.trim());
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <ShoppingBagIcon className="h-8 w-8 text-pink-500" />
            <div>
              <p className="text-xs text-gray-500">Total Produk</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <XCircleIcon className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-xs text-gray-500">Stok Habis (Halaman Ini)</p>
              <p className="text-2xl font-bold text-gray-900">{summary.out}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Nilai (Halaman Ini)</p>
              <p className="text-lg font-bold text-gray-900">
                {formatRupiah(summary.totalValue)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200/70 shadow-sm">
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari kode atau nama produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="pl-9"
            />
          </div>
          <Combobox
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v || "all");
              setPage(1);
            }}
            placeholder="Semua Status"
            className="w-[180px]"
          />
          <Button onClick={applySearch} variant="outline">
            Cari
          </Button>
        </CardContent>
      </Card>

      <Card className="border-gray-200/70 shadow-sm">
        <CardContent className="px-4 py-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200/70">
                  {[
                    "Kode",
                    "Nama Produk",
                    "Kategori",
                    "Stok",
                    "Satuan",
                    "HPP / Unit",
                    "Harga Jual",
                    "Nilai Stok",
                    "Status",
                    "Update",
                  ].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-3 text-left font-medium text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-400">
                      Memuat...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-gray-400">
                      <ShoppingBagIcon className="mx-auto mb-3 h-12 w-12 opacity-30" />
                      <p>Belum ada data stok produk</p>
                      <p className="mt-1 text-xs">
                        Stok muncul otomatis setelah produksi / penyelesaian
                        barang jadi
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const qty = Number(item.qty_available) || 0;
                    const isOut = qty <= 0;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200/70 last:border-0 hover:bg-gray-50/60"
                      >
                        <td className="px-3 py-3 font-mono text-xs text-gray-600">
                          {item.product_kode}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-900">
                          {item.product_nama}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {item.product_kategori || "—"}
                        </td>
                        <td className="px-3 py-3 font-semibold text-pink-700">
                          {formatQty(qty)}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {item.satuan_nama || "—"}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {formatRupiah(Number(item.unit_cost) || 0)}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {formatRupiah(Number(item.harga_jual) || 0)}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {formatRupiah(Number(item.total_value) || 0)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                              isOut
                                ? "border-red-200 bg-red-100 text-red-700"
                                : "border-green-200 bg-green-100 text-green-700"
                            }`}
                          >
                            {isOut ? (
                              <XCircleIcon className="h-3 w-3" />
                            ) : (
                              <CheckCircleIcon className="h-3 w-3" />
                            )}
                            {isOut ? "Habis" : "Tersedia"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {item.last_movement_at
                            ? formatDate(item.last_movement_at)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-gray-200/70 py-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="self-center text-sm text-gray-500">
                Hal {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
