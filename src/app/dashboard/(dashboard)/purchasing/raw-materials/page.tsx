"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { AlertCircle, Eye, Filter, Loader2, Package, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { RawMaterialWithStock, MaterialCategory } from "@/types/purchasing";
import { deleteRawMaterial, listRawMaterials, updateRawMaterialStatus } from "@/lib/purchasing";
import { CsvImporter } from "@/components/ui/csv-importer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const CATEGORY_OPTIONS: { value: MaterialCategory | "all"; label: string }[] = [
  { value: "all", label: "Semua Kategori" },
  { value: "BAHAN_PANGAN", label: "Bahan Pangan" },
  { value: "BAHAN_NON_PANGAN", label: "Bahan Non-Pangan" },
  { value: "KEMASAN", label: "Kemasan" },
  { value: "BAHAN_BAKAR", label: "Bahan Bakar" },
  { value: "LAINNYA", label: "Lainnya" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status Stok" },
  { value: "below_minimum", label: "Stok Menipis/Habis" },
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<RawMaterialWithStock | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    material: RawMaterialWithStock | null;
    nextStatus: boolean;
  }>({
    open: false,
    material: null,
    nextStatus: true,
  });

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listRawMaterials({
        search: search || undefined,
        kategori: categoryFilter === "all" ? undefined : categoryFilter,
        below_minimum: statusFilter === "below_minimum",
        page: pagination.page,
        limit: pagination.limit,
        sort_by: "nama",
        sort_dir: "ASC",
      });
      setMaterials(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        total_pages: response.pagination.total_pages,
      }));
    } catch (error: unknown) {
      console.error("Error loading materials:", error);
      toast.error("Gagal memuat data bahan baku: " + getErrorMessage(error, "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const getCategoryLabel = (category?: MaterialCategory | null) => {
    if (!category) return "-";
    const labels: Record<MaterialCategory, string> = {
      BAHAN_PANGAN: "Bahan Pangan",
      BAHAN_NON_PANGAN: "Bahan Non-Pangan",
      KEMASAN: "Kemasan",
      BAHAN_BAKAR: "Bahan Bakar",
      LAINNYA: "Lainnya",
    };
    return labels[category] || category;
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "AMAN":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Aman
          </Badge>
        );
      case "MENIPIS":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            Menipis
          </Badge>
        );
      case "HABIS":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            Habis
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID", { maximumFractionDigits: 4 });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleConfirmToggleStatus = async () => {
    const material = statusDialog.material;
    if (!material) return;
    if (statusUpdatingId) return;

    setStatusUpdatingId(material.id);
    try {
      await updateRawMaterialStatus(material.id, statusDialog.nextStatus);
      toast.success(`Bahan baku berhasil ${statusDialog.nextStatus ? "diaktifkan" : "dinonaktifkan"}`);
      setStatusDialog({ open: false, material: null, nextStatus: true });
      loadMaterials();
    } catch (error: unknown) {
      console.error("Error updating raw material status:", error);
      toast.error("Gagal mengubah status bahan baku: " + getErrorMessage(error, "Unknown error"));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleOpenDelete = (material: RawMaterialWithStock) => {
    setDeletingMaterial(material);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMaterial || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteRawMaterial(deletingMaterial.id);
      toast.success("Bahan baku berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeletingMaterial(null);
      loadMaterials();
    } catch (error: unknown) {
      console.error("Error deleting raw material:", error);
      toast.error("Gagal menghapus bahan baku: " + getErrorMessage(error, "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Master Data", href: "/dashboard/purchasing/main" },
          { label: "Bahan Baku" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Bahan Baku</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola data bahan baku dengan monitoring stok real-time — {pagination.total} total
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Link href="/dashboard/purchasing/raw-materials/new">
            <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Bahan Baku
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari kode atau nama bahan baku..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-10 pr-10 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" variant="outline" className="h-9 flex-shrink-0">
                Cari
              </Button>
            </form>

            <div className="flex min-w-0 items-center gap-2 md:w-[240px]">
              <Filter className="h-4 w-4 shrink-0 text-gray-400" />
              <Combobox
                options={CATEGORY_OPTIONS}
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value as MaterialCategory | "all");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Filter kategori..."
                searchPlaceholder="Cari kategori..."
                emptyMessage="Kategori tidak ditemukan"
                className="!w-full h-9 text-sm"
              />
            </div>

            <div className="flex min-w-0 items-center gap-2 md:w-[240px]">
              <AlertCircle className="h-4 w-4 shrink-0 text-gray-400" />
              <Combobox
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Filter stok..."
                searchPlaceholder="Cari status stok..."
                emptyMessage="Status stok tidak ditemukan"
                className="!w-full h-9 text-sm"
              />
            </div>

            {(search || categoryFilter !== "all" || statusFilter !== "all" || pagination.page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-9 flex-shrink-0">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            Daftar Bahan Baku
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-600" />
              <p className="mt-2 text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="py-14 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">
                {search ? "Tidak ada bahan baku yang cocok dengan pencarian" : "Belum ada data bahan baku"}
              </p>
              {!search && (
                <Link href="/dashboard/purchasing/raw-materials/new">
                  <Button variant="outline" className="mt-4">
                    Tambah Bahan Baku Pertama
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-gray-900">Kode</TableHead>
                      <TableHead className="text-gray-900">Nama Bahan</TableHead>
                      <TableHead className="text-gray-900">Kategori</TableHead>
                      <TableHead className="text-right text-gray-900">Stok Tersedia</TableHead>
                      <TableHead className="text-right text-gray-900">Min. Stok</TableHead>
                      <TableHead className="text-right text-gray-900">Harga Rata-rata</TableHead>
                      <TableHead className="text-center text-gray-900">Status Stok</TableHead>
                      <TableHead className="text-center text-gray-900">Aktif</TableHead>
                      <TableHead className="text-right text-gray-900">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell>
                          <span className="font-medium text-gray-900">{material.kode}</span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/purchasing/raw-materials/${material.id}`}
                            className="font-medium text-pink-600 hover:underline"
                          >
                            {material.nama}
                          </Link>
                        </TableCell>
                        <TableCell className="text-gray-700">{getCategoryLabel(material.kategori)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              (material.qty_onhand ?? 0) <= 0
                                ? "font-semibold text-red-600"
                                : (material.qty_onhand ?? 0) <= (material.stok_minimum ?? 0)
                                  ? "font-semibold text-yellow-600"
                                  : "text-gray-700"
                            }
                          >
                            {formatNumber(material.qty_onhand ?? 0)}
                          </span>
                          <span className="ml-1 text-sm text-gray-500">
                            {material.satuan_besar_nama || material.satuan_besar?.nama || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          {formatNumber(material.stok_minimum ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          {(material.avg_cost ?? 0) > 0
                            ? `Rp ${(material.avg_cost ?? 0).toLocaleString("id-ID")}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStockStatusBadge(material.status_stok ?? "AMAN")}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={material.is_active ?? true}
                              disabled={statusUpdatingId === material.id}
                              onCheckedChange={(checked) =>
                                setStatusDialog({ open: true, material, nextStatus: checked })
                              }
                              aria-label={`Ubah status ${material.nama}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/dashboard/purchasing/raw-materials/${material.id}`}>
                              <Button variant="ghost" size="sm" className="cursor-pointer">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/purchasing/raw-materials/${material.id}/edit`}>
                              <Button variant="ghost" size="sm" className="cursor-pointer">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-red-500 hover:text-red-600"
                              onClick={() => handleOpenDelete(material)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t border-gray-200/70">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-500">
                    Halaman {pagination.page} dari {Math.max(1, pagination.total_pages)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.min(Math.max(1, pagination.total_pages), prev.page + 1),
                        }))
                      }
                      disabled={pagination.page >= Math.max(1, pagination.total_pages)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open && !statusUpdatingId) {
            setStatusDialog({ open: false, material: null, nextStatus: true });
          }
        }}
      >
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">
              {statusDialog.nextStatus ? "Aktifkan Bahan Baku" : "Nonaktifkan Bahan Baku"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin {statusDialog.nextStatus ? "mengaktifkan" : "menonaktifkan"} bahan baku &quot;{statusDialog.material?.nama}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setStatusDialog({ open: false, material: null, nextStatus: true })}
              disabled={Boolean(statusUpdatingId)}
              className="purchasing-secondary-button"
            >
              Batal
            </Button>
            <Button onClick={handleConfirmToggleStatus} disabled={Boolean(statusUpdatingId)} className="purchasing-main-button">
              {statusUpdatingId
                ? "Menyimpan..."
                : statusDialog.nextStatus
                  ? "Aktifkan"
                  : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">Hapus Bahan Baku</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin menghapus bahan baku &quot;{deletingMaterial?.nama}
              &quot;? Data akan disembunyikan dari daftar. Bahan dengan stok atau yang masih dipakai BOM tidak bisa dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="purchasing-main-button">
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-2xl">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">Import Bahan Baku dari CSV</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Upload file CSV untuk menambahkan bahan baku secara massal
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            <CsvImporter
              title="Import Bahan Baku"
              description="Import data bahan baku dari file CSV"
              templateName="template-bahan-baku.csv"
              apiEndpoint="/api/purchasing/import/raw-materials"
              onSuccess={() => loadMaterials()}
              columns={[
                { key: "kode", label: "Kode", required: true },
                { key: "nama", label: "Nama", required: true },
                { key: "nama_lain", label: "Nama Lain", required: false },
                { key: "kategori", label: "Kategori", required: false },
                { key: "satuan_pembelian", label: "Satuan Pembelian", required: true },
                { key: "satuan_penggunaan", label: "Satuan Penggunaan", required: false },
                { key: "qty_per_unit", label: "Qty Per Unit", required: false, type: "number" },
                { key: "harga_rata_rata", label: "Harga Rata-rata", required: false, type: "number" },
                { key: "stok_minimum", label: "Stok Minimum", required: false, type: "number" },
                { key: "stok_maksimum", label: "Stok Maksimum", required: false, type: "number" },
                { key: "tanggal_mulai_produksi", label: "Tanggal Mulai Produksi", required: false, type: "date" },
                { key: "masa_simpan", label: "Masa Simpan (bulan)", required: false, type: "number" },
                { key: "supplier_utama", label: "Supplier Utama", required: false },
                { key: "deskripsi", label: "Deskripsi", required: false },
                { key: "status", label: "Status", required: false },
              ]}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
