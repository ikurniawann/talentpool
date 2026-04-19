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
  Send,
} from "lucide-react";
import { formatRupiah, formatDate, getPOStatusLabel } from "@/lib/purchasing/utils";

interface POItem {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  total: number;
  received_qty: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  pr_id: string | null;
  pr_number?: string;
  vendor_id: string;
  vendor_name?: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_cost: number;
  total: number;
  order_date: string;
  delivery_date: string | null;
  sent_at: string | null;
  created_at: string;
  items?: POItem[];
}

type POStatus = "all" | "draft" | "sent" | "partial" | "received" | "closed" | "cancelled";

export default function POListPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<POStatus>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    fetchPOs();
  }, [page, statusFilter]);

  async function fetchPOs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const response = await fetch(`/api/purchasing/po?${params}`);
      const data = await response.json();

      if (data.data) {
        setPos(data.data);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
      }
    } catch (error) {
      console.error("Error fetching POs:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPOs();
  }

  const statusOptions = [
    { value: "all", label: "Semua Status" },
    { value: "draft", label: "Draft" },
    { value: "sent", label: "Terkirim" },
    { value: "partial", label: "Partial" },
    { value: "received", label: "Diterima" },
    { value: "closed", label: "Selesai" },
    { value: "cancelled", label: "Dibatalkan" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
          <p className="text-sm text-gray-500">Kelola order pembelian ke vendor</p>
        </div>
        <Link href="/dashboard/purchasing/po/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Buat PO Baru
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari nomor PO atau vendor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="outline">
                Cari
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as POStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[200px]">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total PO</p>
            <p className="text-2xl font-bold">{pos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Draft</p>
            <p className="text-2xl font-bold text-gray-600">
              {pos.filter((p) => p.status === "draft").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Terkirim</p>
            <p className="text-2xl font-bold text-blue-600">
              {pos.filter((p) => p.status === "sent" || p.status === "partial").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Nilai</p>
            <p className="text-2xl font-bold text-green-600">
              {formatRupiah(pos.reduce((sum, p) => sum + p.total, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PO Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Daftar Purchase Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Memuat data...</p>
            </div>
          ) : pos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada data PO</p>
              <Link href="/dashboard/purchasing/po/new">
                <Button variant="outline" className="mt-4">
                  Buat PO Pertama
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
                        No. PO
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Tanggal
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Vendor
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Ref PR
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">
                        Total
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
                    {pos.map((po) => {
                      const statusBadge = getPOStatusLabel(po.status);

                      return (
                        <tr key={po.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">{po.po_number}</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {formatDate(po.order_date)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {po.vendor_name || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {po.pr_number || "-"}
                          </td>
                          <td className="py-3 px-4 text-sm text-right font-medium">
                            {formatRupiah(po.total)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={statusBadge.color}>
                              {statusBadge.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {po.status === "draft" && (
                                <Link href={`/dashboard/purchasing/po/${po.id}/send`}>
                                  <Button variant="ghost" size="sm" title="Kirim ke Vendor">
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </Link>
                              )}
                              <Link href={`/dashboard/purchasing/po/${po.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link
                                href={`/dashboard/purchasing/print/po/${po.id}`}
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
