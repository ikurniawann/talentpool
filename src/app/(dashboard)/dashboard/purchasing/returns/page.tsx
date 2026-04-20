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
  ArrowUturnLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

type ReturnStatus = "pending" | "approved" | "shipped" | "received_by_supplier" | "completed" | "cancelled";

const STATUS_COLORS: Record<ReturnStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  received_by_supplier: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  shipped: "Dikirim",
  received_by_supplier: "Diterima Supplier",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

interface ReturnRow {
  id: string;
  return_number: string;
  goods_receipt_id: string;
  grn_number?: string;
  po_id: string;
  po_number?: string;
  supplier_id: string;
  supplier_name?: string;
  bahan_baku_id: string;
  material_name?: string;
  jumlah: number;
  satuan?: string;
  alasan: string;
  status: ReturnStatus;
  tanggal_pengembalian: string;
  created_at: string;
}

export default function ReturnsListPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  useEffect(() => {
    fetchReturns();
  }, [page, statusFilter]);

  async function fetchReturns() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/purchasing/return?${params}`);
      const data = await res.json();
      if (data.data) {
        setReturns(data.data);
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
          { label: "Retur" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retur</h1>
          <p className="text-sm text-gray-500">Kelola pengembalian barang ke supplier</p>
        </div>
        <Link href="/dashboard/purchasing/returns/new">
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            Tambah Retur
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari no. retur, bahan baku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="approved">Disetujui</SelectItem>
              <SelectItem value="shipped">Dikirim</SelectItem>
              <SelectItem value="received_by_supplier">Diterima Supplier</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowUturnLeftIcon className="w-5 h-5" />
            Daftar Retur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["No. Retur", "GRN / PO", "Supplier", "Bahan Baku", "Jumlah", "Alasan", "Tgl Pengembalian", "Status", "Aksi"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">Memuat...</td>
                  </tr>
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <ArrowUturnLeftIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Belum ada data retur
                    </td>
                  </tr>
                ) : (
                  returns.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono font-medium">{r.return_number || r.id.slice(0, 8)}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="text-xs text-gray-500">{r.grn_number || r.goods_receipt_id.slice(0, 8)}</div>
                        <div className="text-xs text-gray-400">{r.po_number || r.po_id.slice(0, 8)}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">{r.supplier_name || r.supplier_id}</td>
                      <td className="py-3 px-4 text-sm">{r.material_name || r.bahan_baku_id}</td>
                      <td className="py-3 px-4 text-sm">{r.jumlah} {r.satuan || ""}</td>
                      <td className="py-3 px-4 text-sm max-w-[200px] truncate">{r.alasan}</td>
                      <td className="py-3 px-4 text-sm">{r.tanggal_pengembalian || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/purchasing/returns/${r.id}`}>
                          <Button size="sm" variant="ghost"><EyeIcon className="w-4 h-4" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>←</Button>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>→</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
