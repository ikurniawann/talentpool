"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  Plus,
  Search,
  Filter,
  FileText,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatRupiah, formatDate, getPRStatusLabel, getPriorityBadge } from "@/lib/purchasing/utils";

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
  const [prs, setPrs] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PRStatus>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    fetchPRs();
  }, [page, statusFilter]);

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
        setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Purchase Request</h1>
          <p className="text-sm text-gray-500">Kelola permintaan pembelian</p>
        </div>
        <Link href="/dashboard/purchasing/pr/new">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Buat PR Baru
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nomor PR..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline" className="flex-shrink-0">
                Cari
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as PRStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PR Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Daftar Purchase Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
            </div>
          ) : prs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada data PR</p>
              <Link href="/dashboard/purchasing/pr/new">
                <Button variant="outline" className="mt-4">
                  Buat PR Pertama
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        No. PR
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Tanggal
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Departemen
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Requester
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Total
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                        Prioritas
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prs.map((pr) => {
                      const statusBadge = getPRStatusLabel(pr.status);
                      const priorityBadge = getPriorityBadge(pr.priority);

                      return (
                        <tr key={pr.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">
                              {pr.pr_number}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(pr.created_at)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {pr.department_name || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {pr.requester_name || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium">
                            {formatRupiah(pr.total_amount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={priorityBadge.color}>
                              {priorityBadge.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={statusBadge.color}>
                              {statusBadge.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/dashboard/purchasing/pr/${pr.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link
                                href={`/dashboard/purchasing/print/pr/${pr.id}`}
                                target="_blank"
                              >
                                <Button variant="ghost" size="sm">
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

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
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
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
