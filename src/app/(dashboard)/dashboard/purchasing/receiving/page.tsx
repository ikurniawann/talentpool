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
  MagnifyingGlassIcon,
  EyeIcon,
  TruckIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

type GRNStatus = "pending" | "partial" | "completed" | "rejected";

const STATUS_COLORS: Record<GRNStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  partial: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<GRNStatus, string> = {
  pending: "Menunggu",
  partial: "Sebagian",
  completed: "Selesai",
  rejected: "Ditolak",
};

interface GRNRow {
  id: string;
  grn_number: string;
  purchase_order_id: string;
  po_number?: string;
  delivery_id: string;
  delivery_note_number?: string;
  tanggal_terima: string;
  status: GRNStatus;
  penerima_id: string;
  penerima_name?: string;
  notes: string;
  created_at: string;
}

export default function ReceivingListPage() {
  const [grns, setGrns] = useState<GRNRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  useEffect(() => {
    fetchGRNs();
  }, [page, statusFilter]);

  async function fetchGRNs() {
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
          <p className="text-sm text-gray-500">Terima barang dari supplier (GRN)</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari no. GRN, PO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="partial">Sebagian</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
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
                  {["No. GRN", "No. PO", "No. Surat Jalan", "Tgl Terima", "Penerima", "Status", "Aksi"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">Memuat...</td>
                  </tr>
                ) : grns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <ClipboardDocumentCheckIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Belum ada data penerimaan
                    </td>
                  </tr>
                ) : (
                  grns.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono font-medium">{g.grn_number || g.id.slice(0, 8)}</td>
                      <td className="py-3 px-4 text-sm">{g.po_number || g.purchase_order_id.slice(0, 8)}</td>
                      <td className="py-3 px-4 text-sm">{g.delivery_note_number || "—"}</td>
                      <td className="py-3 px-4 text-sm">{g.tanggal_terima || "—"}</td>
                      <td className="py-3 px-4 text-sm">{g.penerima_name || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[g.status]}`}>
                          {STATUS_LABELS[g.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/purchasing/receiving/${g.id}`}>
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
