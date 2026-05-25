"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
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
import { Filter, X } from "lucide-react";
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
  const [filterOpen, setFilterOpen] = useState(false);

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPagination((p) => ({ ...p, page: 1 }));
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const handleResetFilters = () => {
    setSearch("");
    setSearchQuery("");
    setStatusFilter("all");
    setReasonFilter("all");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const isFilterActive = statusFilter !== "all" || reasonFilter !== "all";

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

      <PurchasingListSection
        icon={ArrowPathIcon}
        title="Daftar Retur Pembelian"
        description="Kelola retur barang ke supplier berdasarkan status, alasan, dan total nilai."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:w-auto md:flex-row md:items-center">
            <label className="relative w-full md:w-80">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari nomor return atau catatan..."
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
                  {[statusFilter !== "all", reasonFilter !== "all"].filter(Boolean).length}
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
                    Status
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
                    className="!w-full h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Filter className="h-3.5 w-3.5 text-pink-500" />
                    Alasan
                  </div>
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
                    className="!w-full h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

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
            <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">No. Return</th>
                  <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                  <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-3 text-left font-semibold">Alasan</th>
                  <th className="px-4 py-3 text-left font-semibold">GRN</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-pink-600">
                        {ret.return_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          {format(new Date(ret.return_date), "dd MMM yyyy", { locale: localeId })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                          {ret.supplier?.nama_supplier || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {RETURN_REASON_LABELS[ret.reason_type as ReturnReasonType]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {ret.grn?.grn_number || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatRupiah(ret.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={RETURN_STATUS_COLORS[ret.status as ReturnStatus]}>
                          {RETURN_STATUS_LABELS[ret.status as ReturnStatus]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/purchasing/returns/${ret.id}`}>
                          <Button variant="ghost" size="sm" className="cursor-pointer">
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
            <PurchasingTablePagination
              page={pagination.page}
              totalPages={Math.max(1, pagination.total_pages)}
              totalItems={pagination.total}
              pageSize={20}
              onPageChange={(nextPage) => setPagination((p) => ({ ...p, page: nextPage }))}
            />
          </>
          )}
        </div>
      </PurchasingListSection>
    </div>
  );
}
