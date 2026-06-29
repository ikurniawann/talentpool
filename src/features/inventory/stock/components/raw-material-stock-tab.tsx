"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { formatRupiah } from "@/lib/purchasing/utils";
import {
  CubeIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useRawMaterialStock } from "../queries";
import { listStockWarehouses } from "../api";
import type { RawStockStatus } from "../types";

const STATUS_CONFIG: Record<
  RawStockStatus,
  { label: string; cls: string; icon: typeof CheckCircleIcon }
> = {
  AMAN: {
    label: "Aman",
    cls: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircleIcon,
  },
  MENIPIS: {
    label: "Menipis",
    cls: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: ExclamationTriangleIcon,
  },
  HABIS: {
    label: "Habis",
    cls: "bg-red-100 text-red-700 border-red-200",
    icon: XCircleIcon,
  },
};

type UnitMode = "besar" | "kecil";

const UNIT_OPTIONS = [
  { value: "besar", label: "Satuan Besar" },
  { value: "kecil", label: "Satuan Kecil" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "normal", label: "Aman" },
  { value: "low_stock", label: "Menipis" },
  { value: "out_of_stock", label: "Habis" },
];

function formatQty(value: number | string | null | undefined) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );
}

function formatUnitCost(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    value || 0
  );
}

function resolveDisplay(
  item: {
    qty_onhand: number;
    min_stock: number;
    unit_cost: number;
    satuan?: string | null;
    satuan_besar_nama?: string | null;
    satuan_kecil_nama?: string | null;
    konversi_factor?: number | null;
  },
  mode: UnitMode
) {
  const besarLabel = item.satuan_besar_nama || item.satuan || "—";
  const factor = Number(item.konversi_factor) || 0;
  const hasSmall = Boolean(item.satuan_kecil_nama) && factor > 0;

  // mode kecil hanya berlaku bila ada satuan kecil + faktor konversi
  if (mode === "kecil" && hasSmall) {
    return {
      qty: Number(item.qty_onhand) * factor,
      min: Number(item.min_stock) * factor,
      unitCost: Number(item.unit_cost) / factor,
      unitLabel: item.satuan_kecil_nama as string,
    };
  }
  return {
    qty: Number(item.qty_onhand) || 0,
    min: Number(item.min_stock) || 0,
    unitCost: Number(item.unit_cost) || 0,
    unitLabel: besarLabel,
  };
}

export function RawMaterialStockTab() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [warehouses, setWarehouses] = useState<
    { id: string; name: string; code: string }[]
  >([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [unitMode, setUnitMode] = useState<UnitMode>("besar");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    setLoadingWarehouses(true);
    listStockWarehouses()
      .then(setWarehouses)
      .catch((e) => console.error("Error loading warehouses:", e))
      .finally(() => setLoadingWarehouses(false));
  }, []);

  const warehouseOptions = useMemo(
    () => [
      { value: "all", label: "Semua Gudang" },
      ...warehouses.map((w) => ({
        value: w.id,
        label: w.name,
        description: w.code,
      })),
    ],
    [warehouses]
  );

  const selectedWarehouseLabel = useMemo(() => {
    if (warehouseFilter === "all") return "Semua Gudang";
    return warehouses.find((w) => w.id === warehouseFilter)?.name || "Gudang";
  }, [warehouseFilter, warehouses]);

  const listQuery = useRawMaterialStock({
    page,
    limit,
    status: statusFilter,
    search: appliedSearch || undefined,
    warehouse_id: warehouseFilter,
  });

  const items = listQuery.data?.items ?? [];
  const loading = listQuery.isLoading;
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const summary = useMemo(() => {
    const attention = items.filter(
      (i) => i.status_stok === "MENIPIS" || i.status_stok === "HABIS"
    ).length;
    const totalValue = items.reduce(
      (s, i) => s + (Number(i.total_value) || 0),
      0
    );
    return { attention, totalValue };
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
            <CubeIcon className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Total Bahan Baku</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-xs text-gray-500">
                Perlu Perhatian (Halaman Ini)
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.attention}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-sm">
          <CardContent className="flex items-center gap-3 pt-4">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Nilai Stok (Halaman Ini)</p>
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
              placeholder="Cari kode atau nama bahan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="pl-9"
            />
          </div>
          <Combobox
            options={UNIT_OPTIONS}
            value={unitMode}
            onChange={(v) => setUnitMode((v || "besar") as UnitMode)}
            placeholder="Satuan"
            className="w-[170px]"
          />
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
          <Combobox
            options={warehouseOptions}
            value={warehouseFilter}
            onChange={(v) => {
              setWarehouseFilter(v || "all");
              setPage(1);
            }}
            placeholder={loadingWarehouses ? "Memuat gudang..." : "Semua Gudang"}
            searchPlaceholder="Cari gudang..."
            emptyMessage={loadingWarehouses ? "Memuat..." : "Gudang tidak ditemukan"}
            disabled={loadingWarehouses}
            className="w-[200px]"
          />
          <Button onClick={applySearch} variant="outline">
            Cari
          </Button>
        </CardContent>
      </Card>

      <Card className="border-gray-200/70 shadow-sm">
        <CardContent className="px-4 py-2">
          {warehouseFilter !== "all" && (
            <p className="border-b border-gray-200/70 px-1 py-2 text-xs text-gray-500">
              Menampilkan stok gudang:{" "}
              <span className="font-medium text-gray-700">{selectedWarehouseLabel}</span>
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200/70">
                  {[
                    "Kode",
                    "Nama Bahan",
                    "Kategori",
                    "Stok",
                    "Min.",
                    "Satuan",
                    "Harga / Unit",
                    "Nilai Stok",
                    "Status",
                    "",
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
                      <CubeIcon className="mx-auto mb-3 h-12 w-12 opacity-30" />
                      <p>Belum ada data bahan baku</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const sc =
                      STATUS_CONFIG[item.status_stok] || STATUS_CONFIG.AMAN;
                    const disp = resolveDisplay(item, unitMode);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200/70 last:border-0 hover:bg-gray-50/60"
                      >
                        <td className="px-3 py-3 font-mono text-xs text-gray-600">
                          {item.kode}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-900">
                          {item.nama}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">
                          {item.kategori || "—"}
                        </td>
                        <td className="px-3 py-3 font-semibold text-blue-700">
                          {formatQty(disp.qty)}
                        </td>
                        <td className="px-3 py-3 text-gray-500">
                          {formatQty(disp.min)}
                        </td>
                        <td className="px-3 py-3 text-gray-600">
                          {disp.unitLabel}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          Rp {formatUnitCost(disp.unitCost)}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-800">
                          {formatRupiah(Number(item.total_value) || 0)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.cls}`}
                          >
                            <sc.icon className="h-3 w-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Link href={`/dashboard/items/raw-materials/${item.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              Detail
                            </Button>
                          </Link>
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
