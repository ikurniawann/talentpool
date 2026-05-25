"use client";

import { useState, useEffect } from "react";
import { useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  Printer,
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
  const [statusFilter, setStatusFilter] = useState<PRStatus>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const handledCreatedToast = useRef<string | null>(null);
  const limit = 10;

  useEffect(() => {
    fetchPRs();
  }, [page, statusFilter]);

  useEffect(() => {
    const created = searchParams.get("created");
    if (!created) return;
    if (handledCreatedToast.current === created) return;
    handledCreatedToast.current = created;

    toast.success(created === "draft" ? "Draft PR berhasil disimpan" : "PR berhasil disubmit");
    router.replace("/dashboard/purchasing/pr");
  }, [router, searchParams]);

  async function fetchPRs() {
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
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPRs();
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

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nomor PR..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-10 text-sm"
                />
              </div>
              <Button type="submit" variant="outline" className="h-9 flex-shrink-0">
                Cari
              </Button>
            </form>

            <div className="flex min-w-0 items-center gap-2 md:w-[260px]">
              <Filter className="w-4 h-4 shrink-0 text-gray-400" />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Daftar Purchase Request
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              <div className="px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-gray-900">
                        No. PR
                    </TableHead>
                    <TableHead className="text-gray-900">
                        Tanggal
                    </TableHead>
                    <TableHead className="text-gray-900">
                        Departemen
                    </TableHead>
                    <TableHead className="text-gray-900">
                        Requester
                    </TableHead>
                    <TableHead className="text-right text-gray-900">
                        Total
                    </TableHead>
                    <TableHead className="text-center text-gray-900">
                        Prioritas
                    </TableHead>
                    <TableHead className="text-center text-gray-900">
                        Status
                    </TableHead>
                    <TableHead className="text-right text-gray-900">
                        Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {prs.map((pr) => {
                      const statusBadge = getPRStatusLabel(pr.status);
                      const priorityBadge = getPriorityBadge(pr.priority);

                      return (
                        <TableRow
                          key={pr.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/dashboard/purchasing/pr/${pr.id}`)}
                        >
                          <TableCell>
                            <span className="font-medium text-gray-900">
                              {pr.pr_number}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {formatDate(pr.created_at)}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {pr.department_name || "-"}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {pr.requester_name || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatRupiah(pr.total_amount)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={priorityBadge.color}>
                              {priorityBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={statusBadge.color}>
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              </div>

              {/* Pagination */}
              <div className="border-t border-gray-200/70">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-500">
                    Halaman {page} dari {totalPages}
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
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
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
    </div>
  );
}
