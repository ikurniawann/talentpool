"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { ITEMS_RAW_MATERIALS_PATH } from "@/modules/purchasing/constants/items-nav";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
import { AlertCircle, Eye, Filter, Loader2, Package, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { RawMaterialWithStock, MaterialCategory } from "@/types/purchasing";
import { useRawMaterialList, useRawMaterialCategoryOptions } from "../queries";
import { useDeleteRawMaterial, useUpdateRawMaterialStatus } from "../mutations";
import { CsvImporter } from "@/components/ui/csv-importer";
import {
  Dialog,
  DialogPanel,
  DialogPanelBody,
  DialogPanelDescription,
  DialogPanelHeader,
  DialogPanelTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  buildLookupLabelMap,
  resolveCategoryLabel,
  toLookupOptions,
} from "../master-lookups";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status Stok" },
  { value: "below_minimum", label: "Stok Menipis/Habis" },
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function RawMaterialsPage() {
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<RawMaterialWithStock | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    material: RawMaterialWithStock | null;
    nextStatus: boolean;
  }>({
    open: false,
    material: null,
    nextStatus: true,
  });

  const listQuery = useRawMaterialList({
    search: search || undefined,
    kategori: categoryFilter === "all" ? undefined : categoryFilter,
    below_minimum: statusFilter === "below_minimum",
    page: pagination.page,
    limit: pagination.limit,
    sort_by: "nama",
    sort_dir: "ASC",
  });
  const categoriesQuery = useRawMaterialCategoryOptions();
  const categoryMap = buildLookupLabelMap(categoriesQuery.data);
  const categoryFilterOptions = [
    { value: "all", label: "Semua Kategori" },
    ...toLookupOptions(categoriesQuery.data),
  ];
  const materials = listQuery.data?.data ?? [];
  const loading = listQuery.isLoading;
  const total = listQuery.data?.pagination.total ?? 0;
  const totalPages = listQuery.data?.pagination.total_pages ?? 0;

  const deleteMutation = useDeleteRawMaterial();
  const statusMutation = useUpdateRawMaterialStatus();
  const isDeleting = deleteMutation.isPending;
  const statusUpdatingId = statusMutation.isPending
    ? statusMutation.variables?.id ?? null
    : null;

  const loadMaterials = () => listQuery.refetch();

  useEffect(() => {
    if (listQuery.isError) {
      console.error("Error loading materials:", listQuery.error);
      toast.error("Gagal memuat data bahan baku: " + getErrorMessage(listQuery.error, "Unknown error"));
    }
  }, [listQuery.isError, listQuery.error]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const getCategoryLabel = (category?: MaterialCategory | null) =>
    resolveCategoryLabel(category, categoryMap);

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

  const handleResetFilters = () => {
    setSearchQuery("");
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const isFilterActive = categoryFilter !== "all" || statusFilter !== "all";

  const handleConfirmToggleStatus = async () => {
    const material = statusDialog.material;
    if (!material) return;
    if (statusMutation.isPending) return;

    try {
      await statusMutation.mutateAsync({ id: material.id, isActive: statusDialog.nextStatus });
      toast.success(`Bahan baku berhasil ${statusDialog.nextStatus ? "diaktifkan" : "dinonaktifkan"}`);
      setStatusDialog({ open: false, material: null, nextStatus: true });
    } catch (error: unknown) {
      console.error("Error updating raw material status:", error);
      toast.error("Gagal mengubah status bahan baku: " + getErrorMessage(error, "Unknown error"));
    }
  };

  const handleOpenDelete = (material: RawMaterialWithStock) => {
    setDeletingMaterial(material);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMaterial || isDeleting) return;

    try {
      await deleteMutation.mutateAsync(deletingMaterial.id);
      toast.success("Bahan baku berhasil dihapus");
      setDeleteDialogOpen(false);
      setDeletingMaterial(null);
    } catch (error: unknown) {
      console.error("Error deleting raw material:", error);
      toast.error("Gagal menghapus bahan baku: " + getErrorMessage(error, "Unknown error"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Bahan Baku</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola data bahan baku dengan monitoring stok real-time — {total} total
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Link href={`${ITEMS_RAW_MATERIALS_PATH}/insert`}>
            <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Bahan Baku
            </Button>
          </Link>
        </div>
      </div>

      <PurchasingListSection
        icon={Package}
        title="Daftar Bahan Baku"
        description="Kelola bahan baku, kategori, COA, status stok, dan harga rata-rata."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:w-auto md:flex-row md:items-center">
            <label className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari bahan baku..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 bg-white pl-10 pr-10 text-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
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
            </label>

            <Button
              type="button"
              variant="outline"
              onClick={() => setFilterOpen((open) => !open)}
              className={
                isFilterActive
                  ? "h-10 gap-2 rounded-lg border-pink-600 bg-pink-600 px-3 text-sm font-semibold !text-white shadow-sm hover:!border-pink-700 hover:!bg-pink-700 hover:!text-white [&_*]:!text-white [&_svg]:!text-white"
                  : "h-10 gap-2 rounded-lg border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700"
              }
            >
              <Filter className={isFilterActive ? "h-4 w-4 text-white" : "h-4 w-4"} />
              Filter
              {isFilterActive && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs text-white">
                  {[categoryFilter !== "all", statusFilter !== "all"].filter(Boolean).length}
                </span>
              )}
            </Button>

            {(search || isFilterActive || pagination.page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-10 flex-shrink-0 rounded-lg">
                Reset
              </Button>
            )}
          </div>
        }
      >
        <div>
          {filterOpen && (
            <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Filter className="h-3.5 w-3.5 text-pink-500" />
                    Kategori
                  </div>
                  <Combobox
                    options={categoryFilterOptions}
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

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <AlertCircle className="h-3.5 w-3.5 text-pink-500" />
                    Status Stok
                  </div>
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
              </div>
            </div>
          )}

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
                <Link href={`${ITEMS_RAW_MATERIALS_PATH}/insert`}>
                  <Button variant="outline" className="mt-4">
                    Tambah Bahan Baku Pertama
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Kode</th>
                      <th className="px-4 py-3 text-left font-semibold">Nama Bahan</th>
                      <th className="px-4 py-3 text-left font-semibold">Kategori</th>
                      <th className="px-4 py-3 text-left font-semibold">COA</th>
                      <th className="px-4 py-3 text-right font-semibold">Stok Tersedia</th>
                      <th className="px-4 py-3 text-right font-semibold">Min. Stok</th>
                      <th className="px-4 py-3 text-right font-semibold">Harga Rata-rata</th>
                      <th className="px-4 py-3 text-center font-semibold">Status Stok</th>
                      <th className="px-4 py-3 text-center font-semibold">Aktif</th>
                      <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {materials.map((material) => (
                      <tr key={material.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{material.kode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`${ITEMS_RAW_MATERIALS_PATH}/${material.id}`}
                            className="font-medium text-pink-600 hover:underline"
                          >
                            {material.nama}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{getCategoryLabel(material.kategori)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {material.coa_production && (
                              <Badge className="bg-amber-100 text-amber-700">Prod</Badge>
                            )}
                            {material.coa_rnd && (
                              <Badge className="bg-blue-100 text-blue-700">RnD</Badge>
                            )}
                            {material.coa_asset && (
                              <Badge className="bg-green-100 text-green-700">Asset</Badge>
                            )}
                            {!material.coa_production && !material.coa_rnd && !material.coa_asset && (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
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
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNumber(material.stok_minimum ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {(material.avg_cost ?? 0) > 0
                            ? `Rp ${(material.avg_cost ?? 0).toLocaleString("id-ID")}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getStockStatusBadge(material.status_stok ?? "AMAN")}
                        </td>
                        <td className="px-4 py-3 text-center">
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
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`${ITEMS_RAW_MATERIALS_PATH}/${material.id}`}>
                              <Button variant="ghost" size="sm" className="cursor-pointer">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`${ITEMS_RAW_MATERIALS_PATH}/edit/${material.id}`}>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PurchasingTablePagination
                page={pagination.page}
                totalPages={Math.max(1, totalPages)}
                totalItems={total}
                pageSize={pagination.limit}
                onPageChange={(nextPage) => setPagination((prev) => ({ ...prev, page: nextPage }))}
              />
            </>
          )}
        </div>
      </PurchasingListSection>

      <ConfirmDialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open && !statusUpdatingId) {
            setStatusDialog({ open: false, material: null, nextStatus: true });
          }
        }}
        variant="default"
        title={statusDialog.nextStatus ? "Aktifkan Bahan Baku?" : "Nonaktifkan Bahan Baku?"}
        description={`Apakah Anda yakin ingin ${
          statusDialog.nextStatus ? "mengaktifkan" : "menonaktifkan"
        } bahan baku "${statusDialog.material?.nama ?? ""}"?`}
        confirmLabel={statusDialog.nextStatus ? "Aktifkan" : "Nonaktifkan"}
        loading={Boolean(statusUpdatingId)}
        onConfirm={handleConfirmToggleStatus}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Bahan Baku?"
        description={`Apakah Anda yakin ingin menghapus bahan baku "${
          deletingMaterial?.nama ?? ""
        }"? Data akan disembunyikan dari daftar. Bahan dengan stok atau yang masih dipakai BOM tidak bisa dihapus.`}
        confirmLabel="Hapus"
        loadingLabel="Menghapus..."
        loading={isDeleting}
        onConfirm={handleDelete}
      />

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogPanel size="md">
          <DialogPanelHeader>
            <DialogPanelTitle>Import Bahan Baku dari CSV</DialogPanelTitle>
            <DialogPanelDescription>
              Upload file CSV untuk menambahkan bahan baku secara massal
            </DialogPanelDescription>
          </DialogPanelHeader>
          <DialogPanelBody>
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
          </DialogPanelBody>
        </DialogPanel>
      </Dialog>
    </div>
  );
}
