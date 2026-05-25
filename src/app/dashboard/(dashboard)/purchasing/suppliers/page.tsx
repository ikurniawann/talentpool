"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { CsvImporter } from "@/components/ui/csv-importer";
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Loader2, X } from "lucide-react";
import {
  Supplier,
  SupplierListParams,
  PaymentTerms,
  PAYMENT_TERMS_OPTIONS,
  getPaymentTermsLabel,
} from "@/types/supplier";
import {
  listSuppliers,
  deleteSupplier,
  updateSupplierStatus,
  exportSuppliersCSV,
} from "@/lib/purchasing/supplier";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

// ─── Main List Page ──────────────────────────────────────────────

export default function SuppliersListPage() {
  return (
    <PurchasingGuard minRole="purchasing_staff">
      <SuppliersListInner />
    </PurchasingGuard>
  );
}

function SuppliersListInner() {
  const { user } = useAuth();
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "draft">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentTerms | "all">("all");

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // Dialog
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; supplier: Supplier | null }>({
    open: false,
    supplier: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
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

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params: SupplierListParams = {
        search: search || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        payment_terms: paymentFilter === "all" ? undefined : paymentFilter,
        page,
        limit,
        sort_by: "nama_supplier",
        sort_dir: "ASC",
      };

      const res = await listSuppliers(params);
      setSuppliers(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: unknown) {
      toast.error("Gagal memuat data: " + getErrorMessage(err, "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, page]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ── Actions ──────────────────────────────────────────────────

  async function handleDelete(supplier: Supplier) {
    setDeleteLoading(true);
    try {
      await deleteSupplier(supplier.id);
      toast.success(`Supplier "${supplier.nama_supplier}" berhasil dihapus.`);
      setDeleteDialog({ open: false, supplier: null });
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error("Gagal: " + getErrorMessage(err, "Unknown error"));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleConfirmToggleStatus() {
    const supplier = statusDialog.supplier;
    if (!supplier) return;
    if (statusUpdatingId) return;

    setStatusUpdatingId(supplier.id);
    try {
      await updateSupplierStatus(supplier.id, statusDialog.nextStatus);
      toast.success(`Supplier berhasil ${statusDialog.nextStatus ? "diaktifkan" : "dinonaktifkan"}.`);
      setStatusDialog({ open: false, supplier: null, nextStatus: true });
      fetchSuppliers();
    } catch (err: unknown) {
      toast.error("Gagal mengubah status: " + getErrorMessage(err, "Unknown error"));
    } finally {
      setStatusUpdatingId(null);
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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchQuery.trim());
    setPage(1);
  }

  // ── Render ───────────────────────────────────────────────────

  const isAdmin = user?.role === "purchasing_admin";

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Master Data", href: "/dashboard/purchasing/main" },
          { label: "Supplier" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola vendor &amp; supplier — {total} total
          </p>
        </div>
        {isAdmin && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">
              <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Link href="/dashboard/purchasing/suppliers/new">
              <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
                <PlusIcon className="mr-2 h-4 w-4" />
                Tambah Supplier
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari kode, nama, atau kota supplier..."
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
              className="!w-full h-9 text-sm md:!w-[220px]"
            />

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
              className="!w-full h-9 text-sm md:!w-[200px]"
            />

            <Button variant="outline" onClick={handleExportCSV} title="Export CSV">
              <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
              Export
            </Button>

            {(search || statusFilter !== "all" || paymentFilter !== "all" || page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-9 flex-shrink-0">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5" />
            Daftar Supplier
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              {isAdmin && !search && (
                <Link href="/dashboard/purchasing/suppliers/new">
                  <Button variant="outline" className="mt-4">Tambah Supplier Pertama</Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 text-gray-900">No</TableHead>
                      <TableHead className="text-gray-900">Kode</TableHead>
                      <TableHead className="text-gray-900">Nama Supplier</TableHead>
                      <TableHead className="text-gray-900">Kota</TableHead>
                      <TableHead className="text-gray-900">PIC + Telepon</TableHead>
                      <TableHead className="text-gray-900">Payment Terms</TableHead>
                      <TableHead className="text-center text-gray-900">Status</TableHead>
                      {isAdmin && <TableHead className="text-right text-gray-900">Aksi</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier, idx) => (
                      <TableRow
                        key={supplier.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/purchasing/suppliers/${supplier.id}`)}
                      >
                        <TableCell className="text-sm text-gray-400">
                          {(page - 1) * limit + idx + 1}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900">{supplier.kode}</span>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{supplier.nama_supplier}</TableCell>
                        <TableCell className="text-gray-600">{supplier.kota ?? "-"}</TableCell>
                        <TableCell>
                          <div className="text-gray-700">
                            {supplier.pic_name ?? <span className="text-gray-400">-</span>}
                          </div>
                          {supplier.pic_phone && (
                            <div className="text-xs text-gray-500">{supplier.pic_phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPaymentTermsLabel(supplier.payment_terms)}</Badge>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
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
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/dashboard/purchasing/suppliers/${supplier.id}`}>
                                <Button variant="ghost" size="sm" title="Detail" className="cursor-pointer">
                                  <EyeIcon className="h-4 w-4" />
                                </Button>
                              </Link>
                              {(supplier.is_active || supplier.status === "draft") && (
                                <Link href={`/dashboard/purchasing/suppliers/${supplier.id}/edit`}>
                                  <Button variant="ghost" size="sm" title="Edit" className="cursor-pointer">
                                    <PencilSquareIcon className="h-4 w-4" />
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
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t border-gray-200/70">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-500">
                    Halaman {page} dari {Math.max(1, totalPages)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(Math.max(1, totalPages), p + 1))}
                      disabled={page >= Math.max(1, totalPages)}
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
                fetchSuppliers();
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
