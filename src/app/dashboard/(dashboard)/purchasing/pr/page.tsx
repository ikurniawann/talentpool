"use client";

import { useState, useEffect, useCallback } from "react";
import { useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  Printer,
  X,
} from "lucide-react";
import { formatRupiah, formatDate, getPRStatusLabel, getPriorityBadge } from "@/lib/purchasing/utils";
import { toast } from "sonner";

interface PRItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  estimated_price: number;
  total: number;
}

interface PurchaseRequest {
  id: string;
  pr_number: string;
  requester_id: string;
  requester_name?: string;
  department_id: string;
  department_name?: string;
  status: string;
  total_amount: number;
  priority: string;
  notes: string | null;
  required_date: string | null;
  created_at: string;
  items?: PRItem[];
}

type PRStatus = "all" | "draft" | "pending_head" | "pending_finance" | "pending_direksi" | "approved" | "rejected" | "converted";

export default function PRListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PRStatus>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const handledCreatedToast = useRef<string | null>(null);
  const limit = 10;

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const response = await fetch(`/api/purchasing/pr?${params}`);
      const data = await response.json();

      if (data.data) {
        setPrs(data.data);
        const totalRows = data.pagination?.total || 0;
        setTotal(totalRows);
        setTotalPages(Math.max(1, Math.ceil(totalRows / limit)));
      }
    } catch (error) {
      console.error("Error fetching PRs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchPRs();
  }, [fetchPRs]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    const created = searchParams.get("created");
    if (!created) return;
    if (handledCreatedToast.current === created) return;
    handledCreatedToast.current = created;

    toast.success(created === "draft" ? "Draft PR berhasil disimpan" : "PR berhasil disubmit");
    router.replace("/dashboard/purchasing/pr");
  }, [router, searchParams]);

  function handleResetFilters() {
    setSearch("");
    setSearchQuery("");
    setStatusFilter("all");
    setPage(1);
  }

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "draft", label: "Draft" },
    { value: "pending_head", label: "Pending Head Dept" },
    { value: "pending_finance", label: "Pending Finance" },
    { value: "pending_direksi", label: "Pending Direksi" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "converted", label: "PO Dibuat" },
  ];
  const isFilterActive = statusFilter !== "all";

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Purchase Request" },
        ]}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200/70 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Request</h1>
          <p className="text-sm text-gray-500">Kelola permintaan pembelian — {total} total</p>
        </div>
        <Link href="/dashboard/purchasing/pr/new">
          <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Buat PR Baru
          </Button>
        </Link>
      </div>

      <PurchasingListSection
        icon={FileText}
        title="Daftar Purchase Request"
        description="Pantau PR berdasarkan nomor dokumen, status, prioritas, dan total nilai."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:w-auto md:flex-row md:items-center">
            <label className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nomor PR..."
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
                  1
                </span>
              )}
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
                    options={statusOptions}
                    value={statusFilter}
                    onChange={(value) => {
                      setStatusFilter(value as PRStatus);
                      setPage(1);
                    }}
                    placeholder="Filter status..."
                    searchPlaceholder="Cari status..."
                    emptyMessage="Status tidak ditemukan"
                    className="!w-full h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
            </div>
          ) : prs.length === 0 ? (
            <div className="text-center py-14">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada data PR</p>
              <Link href="/dashboard/purchasing/pr/new">
                <Button variant="outline" className="mt-4 h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">
                  Buat PR Pertama
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">No. PR</th>
                    <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                    <th className="px-4 py-3 text-left font-semibold">Departemen</th>
                    <th className="px-4 py-3 text-left font-semibold">Requester</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                    <th className="px-4 py-3 text-center font-semibold">Prioritas</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {prs.map((pr) => {
                      const statusBadge = getPRStatusLabel(pr.status);
                      const priorityBadge = getPriorityBadge(pr.priority);

                      return (
                        <tr
                          key={pr.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => router.push(`/dashboard/purchasing/pr/${pr.id}`)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">
                              {pr.pr_number}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDate(pr.created_at)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {pr.department_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {pr.requester_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatRupiah(pr.total_amount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={priorityBadge.color}>
                              {priorityBadge.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={statusBadge.color}>
                              {statusBadge.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/dashboard/purchasing/pr/${pr.id}`}>
                                <Button variant="ghost" size="sm" className="cursor-pointer">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link
                                href={`/dashboard/purchasing/print/pr/${pr.id}`}
                                target="_blank"
                              >
                                <Button variant="ghost" size="sm" className="cursor-pointer">
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              </div>

              <PurchasingTablePagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={limit}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </PurchasingListSection>
    </div>
  );
}
