"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
import { CsvImporter } from "@/components/ui/csv-importer";
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { Eye, Filter, Loader2, Pencil, Trash2, X } from "lucide-react";
import {
  Supplier,
  SupplierListParams,
  PaymentTerms,
  PAYMENT_TERMS_OPTIONS,
  getPaymentTermsLabel,
} from "@/types/supplier";
import { exportSuppliersCSV } from "@/lib/purchasing/supplier";
import { useSupplierList } from "../queries";
import { useDeleteSupplier, useUpdateSupplierStatus } from "../mutations";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// ─── Main List Page ──────────────────────────────────────────────

export function SuppliersListPage() {
  return (
    <PurchasingGuard minRole="purchasing_staff">
      <SuppliersListInner />
    </PurchasingGuard>
  );
}

function SuppliersListInner() {
  const { user } = useAuth();
  const router = useRouter();

  // Filters
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentTerms | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // Dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; supplier: Supplier | null }>({
    open: false,
    supplier: null,
  });
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    supplier: Supplier | null;
    nextStatus: boolean;
  }>({
    open: false,
    supplier: null,
    nextStatus: true,
  });

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────

  const listParams: SupplierListParams = {
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    payment_terms: paymentFilter === "all" ? undefined : paymentFilter,
    page,
    limit,
    sort_by: "nama_supplier",
    sort_dir: "ASC",
  };

  const listQuery = useSupplierList(listParams);
  const suppliers = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;
  const totalPages = listQuery.data?.pagination.totalPages ?? 1;
  const loading = listQuery.isLoading;

  const deleteMutation = useDeleteSupplier();
  const statusMutation = useUpdateSupplierStatus();
  const deleteLoading = deleteMutation.isPending;
  const statusUpdatingId = statusMutation.isPending
    ? statusMutation.variables?.id ?? null
    : null;

  useEffect(() => {
    if (listQuery.isError) {
      toast.error("Gagal memuat data: " + getErrorMessage(listQuery.error, "Unknown error"));
    }
  }, [listQuery.isError, listQuery.error]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  // ── Actions ──────────────────────────────────────────────────

  async function handleDelete(supplier: Supplier) {
    try {
      await deleteMutation.mutateAsync(supplier.id);
      toast.success(`Supplier "${supplier.nama_supplier}" berhasil dihapus.`);
      setDeleteDialog({ open: false, supplier: null });
    } catch (err: unknown) {
      toast.error("Gagal: " + getErrorMessage(err, "Unknown error"));
    }
  }

  async function handleConfirmToggleStatus() {
    const supplier = statusDialog.supplier;
    if (!supplier) return;
    if (statusMutation.isPending) return;

    try {
      await statusMutation.mutateAsync({ id: supplier.id, isActive: statusDialog.nextStatus });
      toast.success(`Supplier berhasil ${statusDialog.nextStatus ? "diaktifkan" : "dinonaktifkan"}.`);
      setStatusDialog({ open: false, supplier: null, nextStatus: true });
    } catch (err: unknown) {
      toast.error("Gagal mengubah status: " + getErrorMessage(err, "Unknown error"));
    }
  }

  function handleExportCSV() {
    if (suppliers.length === 0) {
      toast.error("Tidak ada data: Tidak ada supplier untuk di-export.");
      return;
    }
    exportSuppliersCSV(suppliers);
    toast.success("File CSV sedang didownload.");
  }

  function handleResetFilters() {
    setSearchQuery("");
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setPage(1);
  }

  // ── Render ───────────────────────────────────────────────────

  const canManageSuppliers = ["purchasing_admin", "purchasing_manager", "purchasing_staff"].includes(user?.role ?? "");
  const isFilterActive = statusFilter !== "all" || paymentFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola vendor &amp; supplier — {total} total
          </p>
        </div>
        {canManageSuppliers && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">
              <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Link href="/dashboard/purchasing/suppliers/insert">
              <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
                <PlusIcon className="mr-2 h-4 w-4" />
                Tambah Supplier
              </Button>
            </Link>
          </div>
        )}
      </div>

      <PurchasingListSection
        icon={BuildingOfficeIcon}
        title="Daftar Supplier"
        description="Kelola vendor, payment terms, status aktif, dan kontak supplier."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:w-auto md:flex-row md:items-center">
            <label className="relative w-full md:w-80">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari supplier..."
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
                  {[statusFilter !== "all", paymentFilter !== "all"].filter(Boolean).length}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleExportCSV}
              title="Export CSV"
              className="h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700"
            >
              <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
              Export
            </Button>

            {(search || isFilterActive || page > 1) && (
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
                    Status
                  </div>
                  <Combobox
                    options={[
                      { value: "all", label: "Semua Status" },
                      { value: "active", label: "Aktif" },
                      { value: "inactive", label: "Nonaktif" },
                      { value: "draft", label: "Draft" },
                    ]}
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value as typeof statusFilter);
                      setPage(1);
                    }}
                    placeholder="Filter status..."
                    searchPlaceholder="Cari status..."
                    emptyMessage="Status tidak ditemukan"
                    className="!w-full h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Filter className="h-3.5 w-3.5 text-pink-500" />
                    Payment Terms
                  </div>
                  <Combobox
                    options={[
                      { value: "all", label: "Semua Terms" },
                      ...PAYMENT_TERMS_OPTIONS.map((pt) => ({ value: pt, label: pt })),
                    ]}
                    value={paymentFilter}
                    onChange={(value) => {
                      setPaymentFilter(value as PaymentTerms | "all");
                      setPage(1);
                    }}
                    placeholder="Filter terms..."
                    searchPlaceholder="Cari terms..."
                    emptyMessage="Terms tidak ditemukan"
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
          ) : suppliers.length === 0 ? (
            <div className="py-14 text-center">
              <BuildingOfficeIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">
                {search ? "Tidak ada supplier yang cocok dengan pencarian" : "Belum ada data supplier"}
              </p>
              {canManageSuppliers && !search && (
                <Link href="/dashboard/purchasing/suppliers/insert">
                  <Button variant="outline" className="mt-4">Tambah Supplier Pertama</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left font-semibold">No</th>
                      <th className="px-4 py-3 text-left font-semibold">Kode</th>
                      <th className="px-4 py-3 text-left font-semibold">Nama Supplier</th>
                      <th className="px-4 py-3 text-left font-semibold">Kota</th>
                      <th className="px-4 py-3 text-left font-semibold">PIC + Telepon</th>
                      <th className="px-4 py-3 text-left font-semibold">Payment Terms</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      {canManageSuppliers && <th className="px-4 py-3 text-right font-semibold">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {suppliers.map((supplier, idx) => (
                      <tr
                        key={supplier.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/dashboard/purchasing/suppliers/${supplier.id}`)}
                      >
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {(page - 1) * limit + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{supplier.kode}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{supplier.nama_supplier}</td>
                        <td className="px-4 py-3 text-gray-600">{supplier.kota ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700">
                            {supplier.pic_name ?? <span className="text-gray-400">-</span>}
                          </div>
                          {supplier.pic_phone && (
                            <div className="text-xs text-gray-500">{supplier.pic_phone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{getPaymentTermsLabel(supplier.payment_terms)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={supplier.is_active}
                              disabled={statusUpdatingId === supplier.id}
                              onCheckedChange={(checked) =>
                                setStatusDialog({ open: true, supplier, nextStatus: checked })
                              }
                              aria-label={`Ubah status ${supplier.nama_supplier}`}
                            />
                          </div>
                        </td>
                        {canManageSuppliers && (
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/dashboard/purchasing/suppliers/${supplier.id}`}>
                                <Button variant="ghost" size="sm" title="Detail" className="cursor-pointer">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              {(supplier.is_active || supplier.status === "draft") && (
                                <Link href={`/dashboard/purchasing/suppliers/edit/${supplier.id}`}>
                                  <Button variant="ghost" size="sm" title="Edit" className="cursor-pointer">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Hapus"
                                className="cursor-pointer text-red-500 hover:text-red-600"
                                onClick={() => setDeleteDialog({ open: true, supplier })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PurchasingTablePagination
                page={page}
                totalPages={Math.max(1, totalPages)}
                totalItems={total}
                pageSize={limit}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </PurchasingListSection>

      {/* Status Dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open && !statusUpdatingId) {
            setStatusDialog({ open: false, supplier: null, nextStatus: true });
          }
        }}
      >
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">
              {statusDialog.nextStatus ? "Aktifkan Supplier" : "Nonaktifkan Supplier"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin {statusDialog.nextStatus ? "mengaktifkan" : "menonaktifkan"} supplier{" "}
              <strong>{statusDialog.supplier?.nama_supplier}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setStatusDialog({ open: false, supplier: null, nextStatus: true })}
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

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, supplier: null })}
      >
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">Hapus Supplier</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin menghapus supplier{" "}
              <strong>{deleteDialog.supplier?.nama_supplier}</strong>? Data akan
              disembunyikan dari daftar, bukan sekadar dinonaktifkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, supplier: null })}
              disabled={deleteLoading}
              className="purchasing-secondary-button"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.supplier && handleDelete(deleteDialog.supplier)}
              disabled={deleteLoading}
              className="purchasing-main-button"
            >
              {deleteLoading ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-2xl">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">Import Supplier dari CSV</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Upload file CSV untuk menambahkan supplier secara massal
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4">
            <CsvImporter
              title="Import Supplier"
              description="Import data supplier dari file CSV"
              templateName="template-supplier.csv"
              apiEndpoint="/api/purchasing/import/suppliers"
              onSuccess={() => {
                listQuery.refetch();
              }}
              columns={[
                { key: "kode", label: "Kode", required: true, type: "text" },
                { key: "nama", label: "Nama Supplier", required: true, type: "text" },
                { key: "email", label: "Email", required: false, type: "email" },
                { key: "telepon", label: "Telepon", required: false, type: "text" },
                { key: "alamat", label: "Alamat", required: false, type: "text" },
                { key: "kota", label: "Kota", required: false, type: "text" },
                { key: "provinsi", label: "Provinsi", required: false, type: "text" },
                { key: "kode_pos", label: "Kode Pos", required: false, type: "text" },
                { key: "npwp", label: "NPWP", required: false, type: "text" },
                { key: "termin_pembayaran", label: "Termin Pembayaran (hari)", required: false, type: "number" },
                { key: "mata_uang", label: "Mata Uang", required: false, type: "text" },
                { key: "kategori", label: "Kategori", required: false, type: "text" },
                { key: "deskripsi", label: "Deskripsi", required: false, type: "text" },
                { key: "status", label: "Status", required: false, type: "text" },
              ]}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
