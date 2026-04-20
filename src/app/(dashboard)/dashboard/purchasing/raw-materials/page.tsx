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
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import {
  CubeIcon,
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
  RawMaterial,
  RawMaterialListParams,
  KATEGORI_OPTIONS,
  Kategori,
} from "@/types/raw-material";
import {
  listRawMaterials,
  exportRawMaterialsCSV,
} from "@/lib/purchasing/raw-materials";

// ─── Status badge ───────────────────────────────────────────────

function StokStatusBadge({ status }: { status: string }) {
  if (status === "AMAN") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aman</Badge>;
  }
  if (status === "MENIPIS") {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Menipis</Badge>;
  }
  if (status === "HABIS") {
    return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Habis</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

// ─── Format helpers ─────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Main List Page ──────────────────────────────────────────────

export default function RawMaterialsListPage() {
  return (
    <PurchasingGuard minRole="purchasing_staff">
      <RawMaterialsListInner />
    </PurchasingGuard>
  );
}

function RawMaterialsListInner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<Kategori | "all">("all");
  const [stokFilter, setStokFilter] = useState<"all" | "below_minimum">("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Sort
  const [sortBy, setSortBy] = useState<RawMaterialListParams["sort_by"]>("created_at");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("DESC");

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Fetch ────────────────────────────────────────────────────

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params: RawMaterialListParams = {
        search: debouncedSearch || undefined,
        kategori: kategoriFilter === "all" ? undefined : kategoriFilter,
        is_active: true,
        below_minimum: stokFilter === "below_minimum" ? true : undefined,
        page,
        limit,
        sort_by: sortBy,
        sort_dir: sortDir,
      };

      const res = await listRawMaterials(params);
      setMaterials(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      toast({
        title: "Gagal memuat data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, kategoriFilter, stokFilter, page, limit, sortBy, sortDir, toast]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

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

  function handleExportCSV() {
    if (materials.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada bahan baku untuk di-export.",
        variant: "destructive",
      });
      return;
    }
    exportRawMaterialsCSV(materials);
    toast({ title: "Berhasil", description: "File CSV sedang didownload." });
  }

  function handleResetFilters() {
    setSearch("");
    setKategoriFilter("all");
    setStokFilter("all");
    setPage(1);
  }

  function toggleSort(field: RawMaterialListParams["sort_by"]) {
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

  const isAdmin = user?.role === "purchasing_admin" || user?.role === "super_admin";

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Bahan Baku" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bahan Baku</h1>
          <p className="text-sm text-gray-500">
            Master bahan baku &amp; inventory — {total} total
          </p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/purchasing/raw-materials/new">
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              Tambah Bahan
            </Button>
          </Link>
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
                placeholder="Cari kode atau nama bahan..."
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

            {/* Kategori filter */}
            <Select
              value={kategoriFilter}
              onValueChange={(v) => { setKategoriFilter(v as any); setPage(1); }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {KATEGORI_OPTIONS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stok filter */}
            <Select
              value={stokFilter}
              onValueChange={(v) => { setStokFilter(v as any); setPage(1); }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Stok</SelectItem>
                <SelectItem value="below_minimum">Below Minimum</SelectItem>
              </SelectContent>
            </Select>

            {/* Export CSV */}
            <Button variant="outline" onClick={handleExportCSV} title="Export CSV">
              <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
              Export
            </Button>

            {/* Reset */}
            {(search || kategoriFilter !== "all" || stokFilter !== "all") && (
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
            <CubeIcon className="w-5 h-5" />
            Daftar Bahan Baku
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("kode_bahan")}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      Kode
                      <ArrowsUpDownIcon className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("nama_bahan")}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      Nama Bahan
                      <ArrowsUpDownIcon className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("kategori")}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      Kategori
                      <ArrowsUpDownIcon className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Min. Stok</TableHead>
                  <TableHead className="text-right">Harga Avg</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex justify-center items-center gap-2 text-gray-400">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Memuat...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <CubeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-400">Belum ada bahan baku</p>
                      {isAdmin && (
                        <Link href="/dashboard/purchasing/raw-materials/new">
                          <Button variant="link" className="mt-2">+ Tambah Bahan</Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((mat, idx) => (
                    <TableRow
                      key={mat.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/purchasing/raw-materials/${mat.id}`)}
                    >
                      <TableCell className="text-gray-400 text-sm">
                        {(page - 1) * limit + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{mat.kode}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{mat.nama}</TableCell>
                      <TableCell>
                        {mat.kategori ? (
                          <Badge variant="outline">{mat.kategori.replace(/_/g, " ")}</Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mat.satuan_besar?.nama ?? <span className="text-gray-400">—</span>}
                        {mat.satuan_kecil && (
                          <span className="text-xs text-gray-400 ml-1">
                            / {mat.satuan_kecil.nama}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {mat.qty_onhand.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right text-gray-500">
                        {mat.minimum_stock.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        {mat.avg_cost > 0 ? (
                          <span className="text-gray-700">{formatCurrency(mat.avg_cost)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <StokStatusBadge status={mat.status_stok} />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/dashboard/purchasing/raw-materials/${mat.id}`}>
                            <Button variant="ghost" size="sm" title="Detail">
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                          </Link>
                          {isAdmin && (
                            <>
                              <Link href={`/dashboard/purchasing/raw-materials/${mat.id}/edit`}>
                                <Button variant="ghost" size="sm" title="Edit">
                                  <PencilSquareIcon className="w-4 h-4" />
                                </Button>
                              </Link>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && materials.length > 0 && (
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
    </div>
  );
}
