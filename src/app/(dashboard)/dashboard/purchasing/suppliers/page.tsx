"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Pagination,
  PaginationProps,
} from "@/components/ui/pagination";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { CsvImporter } from "@/components/ui/csv-importer";
import {
  BuildingOfficeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  PowerIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  Supplier,
  SupplierListParams,
  PaymentTerms,
  PAYMENT_TERMS_OPTIONS,
  getPaymentTermsLabel,
} from "@/types/supplier";
import {
  listSuppliers,
  deactivateSupplier,
  exportSuppliersCSV,
} from "@/lib/purchasing/supplier";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

// ─── Status badge ───────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Aktif
    </Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
      Nonaktif
    </Badge>
  );
}

// ─── Format helpers ─────────────────────────────────────────────

function formatCurrency(amount: number, currency: string = "IDR"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [paymentFilter, setPaymentFilter] = useState<PaymentTerms | "all">("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Sort
  const [sortBy, setSortBy] = useState<SupplierListParams["sort_by"]>("nama_supplier");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");

  // Dialog
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; supplier: Supplier | null }>({
    open: false,
    supplier: null,
  });
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params: SupplierListParams = {
        search: debouncedSearch || undefined,
        is_active: statusFilter === "all" ? undefined : statusFilter === "active",
        payment_terms: paymentFilter === "all" ? undefined : paymentFilter,
        page,
        limit,
        sort_by: sortBy,
        sort_dir: sortDir,
      };

      const res = await listSuppliers(params);
      setSuppliers(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      toast.error("Gagal memuat data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, paymentFilter, page, limit, sortBy, sortDir, toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // ── Actions ──────────────────────────────────────────────────

  async function handleDeactivate(supplier: Supplier) {
    setDeactivateLoading(true);
    try {
      await deactivateSupplier(supplier.id);
      toast.success(`Supplier "${supplier.nama_supplier}" dinonaktifkan.`);
      setDeactivateDialog({ open: false, supplier: null });
      fetchSuppliers();
    } catch (err: any) {
      toast.error("Gagal: " + err.message);
    } finally {
      setDeactivateLoading(false);
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
    setSearch("");
    setStatusFilter("active");
    setPaymentFilter("all");
    setPage(1);
  }

  function toggleSort(field: SupplierListParams["sort_by"]) {
    if (sortBy === field) {
      setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(field);
      setSortDir("ASC");
    }
  }

  // ── Pagination ───────────────────────────────────────────────

  const paginationProps: PaginationProps = {
    currentPage: page,
    totalPages,
    totalItems: total,
    onPageChange: setPage,
  };

  // ── Render ───────────────────────────────────────────────────

  const isAdmin = user?.role === "purchasing_admin";

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Supplier" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier</h1>
          <p className="text-sm text-gray-500">
            Kelola vendor &amp; supplier — {total} total
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Link href="/dashboard/purchasing/suppliers/new">
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                Tambah Supplier
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari kode, nama, atau kota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment terms filter */}
            <Select
              value={paymentFilter}
              onValueChange={(v) => { setPaymentFilter(v as any); setPage(1); }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Terms</SelectItem>
                {PAYMENT_TERMS_OPTIONS.map((pt) => (
                  <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export CSV */}
            <Button variant="outline" onClick={handleExportCSV} title="Export CSV">
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Export
            </Button>

            {/* Reset */}
            {(search || statusFilter !== "active" || paymentFilter !== "all") && (
              <Button variant="ghost" onClick={handleResetFilters}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5" />
            Daftar Supplier
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-gray-900">No</TableHead>
                  <TableHead className="text-gray-900">
                    <button
                      onClick={() => toggleSort("kode_supplier")}
                      className="flex items-center gap-1 hover:text-primary text-gray-900 bg-transparent"
                    >
                      Kode
                      <ArrowsUpDownIcon className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-gray-900">
                    <button
                      onClick={() => toggleSort("nama_supplier")}
                      className="flex items-center gap-1 hover:text-primary text-gray-900 bg-transparent"
                    >
                      Nama Supplier
                      <ArrowsUpDownIcon className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-gray-900">
                    <button
                      onClick={() => toggleSort("kota")}
                      className="flex items-center gap-1 hover:text-primary text-gray-900 bg-transparent"
                    >
                      Kota
                      <ArrowsUpDownIcon className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-gray-900">PIC + Telepon</TableHead>
                  <TableHead className="text-gray-900">Payment Terms</TableHead>
                  <TableHead className="text-gray-900 text-center">Status</TableHead>
                  {isAdmin && <TableHead className="text-gray-900 text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12">
                      <div className="flex justify-center items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Memuat...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12">
                      <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-400">Belum ada supplier</p>
                      {isAdmin && (
                        <Link href="/dashboard/purchasing/suppliers/new">
                          <Button variant="link" className="mt-2">+ Tambah Supplier</Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier, idx) => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/purchasing/suppliers/${supplier.id}`)}
                    >
                      <TableCell className="text-gray-400 text-sm">
                        {(page - 1) * limit + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{supplier.kode}</TableCell>
                      <TableCell className="font-medium">{supplier.nama_supplier}</TableCell>
                      <TableCell>{supplier.kota ?? <span className="text-gray-400">—</span>}</TableCell>
                      <TableCell>
                        <div>
                          {supplier.pic_name ?? <span className="text-gray-400">—</span>}
                        </div>
                        {supplier.pic_phone && (
                          <div className="text-xs text-gray-500">{supplier.pic_phone}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPaymentTermsLabel(supplier.payment_terms)}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge isActive={supplier.is_active} />
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/purchasing/suppliers/${supplier.id}`}>
                              <Button variant="ghost" size="sm" title="Detail">
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/purchasing/suppliers/${supplier.id}/edit`}>
                              <Button variant="ghost" size="sm" title="Edit">
                                <PencilSquareIcon className="w-4 h-4" />
                              </Button>
                            </Link>
                            {supplier.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Nonaktifkan"
                                onClick={() => setDeactivateDialog({ open: true, supplier })}
                              >
                                <PowerIcon className="w-4 h-4 text-orange-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && suppliers.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Menampilkan</span>
                <Select
                  value={String(limit)}
                  onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>dari {total} data</span>
              </div>
              <Pagination {...paginationProps} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deactivate Dialog */}
      <Dialog
        open={deactivateDialog.open}
        onOpenChange={(open) => !open && setDeactivateDialog({ open: false, supplier: null })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nonaktifkan Supplier</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan supplier{" "}
              <strong>{deactivateDialog.supplier?.nama_supplier}</strong>? Supplier
              tidak akan muncul di daftar aktif tapi data tidak dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeactivateDialog({ open: false, supplier: null })}
              disabled={deactivateLoading}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deactivateDialog.supplier && handleDeactivate(deactivateDialog.supplier)}
              disabled={deactivateLoading}
            >
              {deactivateLoading ? "Menonaktifkan..." : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Supplier dari CSV</DialogTitle>
            <DialogDescription>
              Upload file CSV untuk menambahkan supplier secara massal
            </DialogDescription>
          </DialogHeader>
          <CsvImporter
            title="Import Supplier"
            description="Import data supplier dari file CSV"
            templateName="template-supplier.csv"
            apiEndpoint="/api/purchasing/import/suppliers"
            onSuccess={() => {
              loadSuppliers();
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
