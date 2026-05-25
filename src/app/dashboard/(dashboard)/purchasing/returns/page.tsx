"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { listReturns } from "@/lib/purchasing/return";
import {
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  RETURN_REASON_LABELS,
  ReturnStatus,
  ReturnReasonType,
  PurchaseReturn,
} from "@/types/purchasing";
import {
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CalendarIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/purchasing/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 1 });
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "all">("all");
  const [reasonFilter, setReasonFilter] = useState<ReturnReasonType | "all">("all");

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listReturns({
        page: pagination.page,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        reason_type: reasonFilter === "all" ? undefined : reasonFilter,
        search: search || undefined,
      });
      setReturns(result.data);
      setPagination({
        page: result.pagination.page,
        total: result.pagination.total,
        total_pages: result.pagination.total_pages,
      });
    } catch (error) {
      console.error("Error loading returns:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, reasonFilter, search, statusFilter]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery.trim());
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleResetFilters = () => {
    setSearch("");
    setSearchQuery("");
    setStatusFilter("all");
    setReasonFilter("all");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Retur Pembelian" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retur Pembelian</h1>
          <p className="text-sm text-gray-500">Kelola retur barang ke supplier — {pagination.total} total</p>
        </div>
        <Link href="/dashboard/purchasing/returns/new">
          <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
            <PlusIcon className="w-4 h-4 mr-2" />
            Buat Return
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Total Return</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Pending Approval</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {returns.filter((r) => r.status === "pending_approval").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {returns.filter((r) => r.status === "approved").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Total Nilai</p>
            <p className="mt-1 text-2xl font-bold text-pink-600">
              {formatRupiah(returns.reduce((sum, r) => sum + (r.total_amount || 0), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari nomor return atau catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-10 text-sm"
              />
            </div>
            <Combobox
              options={[
                { value: "all", label: "Semua Status" },
                { value: "draft", label: "Draft" },
                { value: "pending_approval", label: "Pending Approval" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "completed", label: "Completed" },
              ]}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value as ReturnStatus | "all");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Filter status..."
              searchPlaceholder="Cari status..."
              emptyMessage="Status tidak ditemukan"
              className="!w-full h-9 text-sm md:!w-[220px]"
            />
            <Combobox
              options={[
                { value: "all", label: "Semua Alasan" },
                { value: "damaged", label: "Barang Rusak" },
                { value: "wrong_item", label: "Barang Salah" },
                { value: "expired", label: "Expired" },
                { value: "overstock", label: "Overstock" },
                { value: "specification_mismatch", label: "Tidak Sesuai Spek" },
                { value: "other", label: "Lainnya" },
              ]}
              value={reasonFilter}
              onChange={(value) => {
                setReasonFilter(value as ReturnReasonType | "all");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Filter alasan..."
              searchPlaceholder="Cari alasan..."
              emptyMessage="Alasan tidak ditemukan"
              className="!w-full h-9 text-sm md:!w-[220px]"
            />
            <Button type="submit" variant="outline" className="h-9 flex-shrink-0">
              Cari
            </Button>
            {(search || statusFilter !== "all" || reasonFilter !== "all" || pagination.page > 1) && (
              <Button type="button" variant="outline" onClick={handleResetFilters} className="h-9 flex-shrink-0">
                Reset
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5" />
            Daftar Retur Pembelian
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : returns.length === 0 ? (
            <div className="py-14 text-center">
              <ArrowPathIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Belum ada data return</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto px-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-gray-900">No. Return</TableHead>
                  <TableHead className="text-gray-900">Tanggal</TableHead>
                  <TableHead className="text-gray-900">Supplier</TableHead>
                  <TableHead className="text-gray-900">Alasan</TableHead>
                  <TableHead className="text-gray-900">GRN</TableHead>
                  <TableHead className="text-right text-gray-900">Total</TableHead>
                  <TableHead className="text-center text-gray-900">Status</TableHead>
                  <TableHead className="text-right text-gray-900">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-mono text-xs font-medium text-pink-600">
                        {ret.return_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          {format(new Date(ret.return_date), "dd MMM yyyy", { locale: localeId })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                          {ret.supplier?.nama_supplier || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {RETURN_REASON_LABELS[ret.reason_type as ReturnReasonType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {ret.grn?.grn_number || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(ret.total_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={RETURN_STATUS_COLORS[ret.status as ReturnStatus]}>
                          {RETURN_STATUS_LABELS[ret.status as ReturnStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/purchasing/returns/${ret.id}`}>
                          <Button variant="ghost" size="sm" className="cursor-pointer">
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
            {pagination.total_pages > 1 && (
              <div className="border-t border-gray-200/70">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-500">
                    Halaman {pagination.page} dari {pagination.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                      disabled={pagination.page === 1}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination((p) => ({ ...p, page: Math.min(pagination.total_pages, p.page + 1) }))}
                      disabled={pagination.page >= pagination.total_pages}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
