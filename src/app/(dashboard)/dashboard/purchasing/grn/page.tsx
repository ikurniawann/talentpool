"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

import { formatDate } from "@/lib/purchasing/utils";

type GrnStatus = "pending" | "partially_received" | "received" | "rejected";

const STATUS_COLORS: Record<GrnStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partially_received: "bg-orange-100 text-orange-800",
  received: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<GrnStatus, string> = {
  pending: "Menunggu",
  partially_received: "Diterima Sebagian",
  received: "Diterima",
  rejected: "Ditolak",
};

interface GrnRow {
  id: string;
  nomor_grn: string;
  delivery_id: string;
  delivery_number: string;
  po_id: string;
  po_number: string;
  supplier_name: string;
  no_surat_jalan: string;
  tanggal_penerimaan: string;
  status: GrnStatus;
  total_item_diterima: number;
  total_item_ditolak: number;
  created_at: string;
}

export default function GrnListPage() {
  const [grns, setGrns] = useState<GrnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  useEffect(() => {
    fetchGrns();
  }, [page, statusFilter]);

  async function fetchGrns() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/purchasing/grn?${params}`);
      const data = await res.json();
      if (data.data) {
        setGrns(data.data);
        setTotalPages(Math.ceil((data.pagination?.total || 0) / limit));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Penerimaan" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Penerimaan Barang</h1>
          <p className="text-sm text-gray-500">Catat penerimaan barang dari supplier</p>
        </div>
        <Link href="/dashboard/purchasing/grn/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusIcon className="w-4 h-4 mr-2" />
            Input Penerimaan
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-5 h-5" />
            Filter Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari nomor GRN / surat jalan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchGrns()}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="partially_received">Diterima Sebagian</SelectItem>
              <SelectItem value="received">Diterima</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-5 h-5" />
            Daftar Penerimaan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["No. GRN", "Supplier", "No. Surat Jalan", "PO", "Tgl Terima", "Status", "Item Diterima", "Aksi"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">Memuat...</td>
                  </tr>
                ) : grns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <ClipboardDocumentCheckIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Belum ada data penerimaan
                    </td>
                  </tr>
                ) : (
                  grns.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono font-medium text-blue-600">{g.nomor_grn}</td>
                      <td className="py-3 px-4 text-sm font-medium">{g.supplier_name || "—"}</td>
                      <td className="py-3 px-4 text-sm">{g.no_surat_jalan || "—"}</td>
                      <td className="py-3 px-4 text-sm">{g.po_number || "—"}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(g.tanggal_penerimaan)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[g.status]}`}>
                          {STATUS_LABELS[g.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {g.total_item_diterima || 0}
                        {g.total_item_ditolak > 0 && (
                          <span className="text-red-500 ml-1">({g.total_item_ditolak} ditolak)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Link href={`/dashboard/purchasing/grn/${g.id}`}>
                            <Button variant="ghost" size="sm" title="Lihat Detail">
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                          </Link>
                          {g.status === "partially_received" && (
                            <Link href={`/dashboard/purchasing/grn/continue/${g.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs px-2"
                                title="Lanjutkan Penerimaan"
                              >
                                Lanjutkan
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="py-2 px-4 text-sm text-gray-600">
                Halaman {page} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
