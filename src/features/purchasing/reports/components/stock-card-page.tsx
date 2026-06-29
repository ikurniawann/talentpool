"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowPathIcon, DocumentArrowDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatRupiah } from "@/lib/purchasing/utils";
import { useStockCard } from "../queries";
import type { StockMovement, StockMovementType as MovementType } from "../types";

const TYPE_LABELS: Record<MovementType, string> = {
  all: "Semua Tipe",
  in: "Masuk",
  out: "Keluar",
  adjustment: "Adjustment",
  transfer: "Transfer",
  return: "Retur",
};

const TYPE_STYLES: Record<Exclude<MovementType, "all">, string> = {
  in: "border-emerald-200 bg-emerald-50 text-emerald-700",
  out: "border-red-200 bg-red-50 text-red-700",
  adjustment: "border-amber-200 bg-amber-50 text-amber-700",
  transfer: "border-sky-200 bg-sky-50 text-sky-700",
  return: "border-violet-200 bg-violet-50 text-violet-700",
};

function formatNumber(value: unknown) {
  const numeric = Number(value);
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function movementDelta(movement: StockMovement) {
  const diff = movement.qty_after - movement.qty_before;
  if (diff === 0) return movement.tipe === "out" ? -movement.jumlah : movement.jumlah;
  return diff;
}

export function StockCardPage() {
  const [selectedMaterial, setSelectedMaterial] = useState("all");
  const [materialSearch, setMaterialSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [movementType, setMovementType] = useState<MovementType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [urlFilterReady, setUrlFilterReady] = useState(false);

  useEffect(() => {
    const materialId = new URLSearchParams(window.location.search).get("material_id");
    if (materialId) setSelectedMaterial(materialId);
    setUrlFilterReady(true);
  }, []);

  const stockCardQuery = useStockCard(
    {
      material_id: selectedMaterial !== "all" ? selectedMaterial : undefined,
      search: appliedSearch || undefined,
      tipe: movementType !== "all" ? movementType : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      limit: 500,
    },
    urlFilterReady
  );
  const data = stockCardQuery.data ?? null;
  const loading = !urlFilterReady || stockCardQuery.isLoading || stockCardQuery.isFetching;

  const loadData = () => stockCardQuery.refetch();

  useEffect(() => {
    if (stockCardQuery.isError) {
      console.error("Error loading stock card:", stockCardQuery.error);
      toast.error(
        stockCardQuery.error instanceof Error
          ? stockCardQuery.error.message
          : "Gagal memuat stock card"
      );
    }
  }, [stockCardQuery.isError, stockCardQuery.error]);

  const selectedMaterialData = data?.selected_material || null;
  const movements = data?.movements || [];
  const materials = useMemo(() => data?.materials || [], [data?.materials]);
  const summary = data?.summary;

  const totalPositive = (summary?.total_in || 0) + (summary?.total_adjustment_in || 0) + (summary?.total_return || 0);
  const totalNegative = (summary?.total_out || 0) + (summary?.total_adjustment_out || 0);

  const materialOptions = useMemo(() => {
    return materials.slice(0, 250);
  }, [materials]);

  const applyFilters = () => {
    const nextSearch = materialSearch.trim();
    if (nextSearch === appliedSearch) {
      loadData();
      return;
    }
    setAppliedSearch(nextSearch);
  };

  const handleExportCSV = () => {
    const headers = [
      "Tanggal",
      "Kode Bahan",
      "Nama Bahan",
      "Tipe",
      "Ref",
      "Alasan",
      "Qty Before",
      "Mutasi",
      "Qty After",
      "Unit Cost",
      "Total Cost",
      "Catatan",
    ];
    const rows = movements.map((movement) => [
      formatDate(movement.created_at),
      movement.material_kode,
      movement.material_nama,
      TYPE_LABELS[movement.tipe],
      movement.reference_number,
      movement.alasan,
      String(movement.qty_before),
      String(movementDelta(movement)),
      String(movement.qty_after),
      String(movement.unit_cost),
      String(movement.total_cost),
      movement.catatan,
    ]);

    const csv = [
      headers.map((header) => `"${header}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stock-card-${selectedMaterialData?.kode || "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Stock card berhasil diexport");
  };

  return (
    <div className="p-6">
      <div className="mt-4 mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Inventory Stock Card</h1>
          <p className="mt-1 text-sm text-gray-500">Kartu stok per bahan baku berdasarkan mutasi barang masuk, produksi, adjustment, dan retur.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <ArrowPathIcon className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={movements.length === 0}>
            <DocumentArrowDownIcon className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_170px_170px_170px_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Cari Bahan</Label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={materialSearch}
                  onChange={(event) => setMaterialSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyFilters();
                  }}
                  placeholder="Nama atau kode bahan..."
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Material</Label>
              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger className="h-10">
                  <span className="flex-1 truncate text-left">
                    {selectedMaterial === "all"
                      ? "Semua Material"
                      : selectedMaterialData
                        ? `${selectedMaterialData.kode} - ${selectedMaterialData.nama}`
                        : "Pilih material"}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">Semua Material</SelectItem>
                  {materialOptions.map((material) => (
                    <SelectItem key={material.id} value={material.id}>
                      {material.kode} - {material.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipe Mutasi</Label>
              <Select value={movementType} onValueChange={(value) => setMovementType(value as MovementType)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-10" />
            </div>
            <Button type="button" onClick={applyFilters} className="h-10 bg-pink-600 hover:bg-pink-700">
              Terapkan
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedMaterialData && (
        <Card className="mb-6 border-pink-100 bg-pink-50/50">
          <CardContent className="grid gap-4 pt-5 md:grid-cols-5">
            <div className="md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-pink-600">Material Terpilih</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-950">{selectedMaterialData.nama}</h2>
              <p className="text-sm text-gray-500">{selectedMaterialData.kode} · {selectedMaterialData.kategori}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Stok Saat Ini</p>
              <p className="mt-1 text-xl font-bold text-gray-950">{formatNumber(selectedMaterialData.qty_onhand)} {selectedMaterialData.satuan}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg Cost</p>
              <p className="mt-1 text-xl font-bold text-gray-950">{formatRupiah(selectedMaterialData.avg_cost)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lokasi</p>
              <p className="mt-1 text-sm font-semibold text-gray-950">{selectedMaterialData.lokasi_rak}</p>
              <Badge className="mt-2 border-pink-200 bg-white text-pink-700">{selectedMaterialData.status_stok}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo Awal</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatNumber(summary?.opening_balance)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600">Total Masuk</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-emerald-600">{formatNumber(totalPositive)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Total Keluar</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-600">{formatNumber(totalNegative)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo Akhir</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-pink-600">{formatNumber(summary?.closing_balance)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Jumlah Mutasi</CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{summary?.movement_count || 0}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg">Riwayat Kartu Stok</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Tipe</th>
                  <th className="px-4 py-3">Referensi</th>
                  <th className="px-4 py-3">Alasan</th>
                  <th className="px-4 py-3 text-right">Before</th>
                  <th className="px-4 py-3 text-right">Mutasi</th>
                  <th className="px-4 py-3 text-right">After</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">Memuat stock card...</td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">Belum ada mutasi untuk filter ini.</td>
                  </tr>
                ) : (
                  movements.map((movement) => {
                    const delta = movementDelta(movement);
                    return (
                      <tr key={movement.id} className="hover:bg-pink-50/40">
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(movement.created_at)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-950">{movement.material_nama}</p>
                          <p className="text-xs text-gray-500">{movement.material_kode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={TYPE_STYLES[movement.tipe]}>{TYPE_LABELS[movement.tipe]}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{movement.reference_number}</p>
                          <p className="text-xs text-gray-500">{movement.reference_type}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{movement.alasan}</td>
                        <td className="px-4 py-3 text-right">{formatNumber(movement.qty_before)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${delta < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {delta > 0 ? "+" : ""}{formatNumber(delta)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-950">{formatNumber(movement.qty_after)}</td>
                        <td className="px-4 py-3 text-right">{formatRupiah(movement.unit_cost)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-pink-700">{formatRupiah(movement.total_cost)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
