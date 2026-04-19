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
  TruckIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  MapPinIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

type DeliveryStatus = "pending" | "shipped" | "in_transit" | "delivered" | "cancelled";

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  shipped: "bg-blue-100 text-blue-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Menunggu",
  shipped: "Dikirim",
  in_transit: "Dalam Perjalanan",
  delivered: "Tiba",
  cancelled: "Dibatalkan",
};

interface DeliveryRow {
  id: string;
  delivery_number: string;
  po_id: string;
  po_number: string;
  no_surat_jalan: string;
  ekspedisi: string;
  no_resi: string;
  tanggal_kirim: string;
  tanggal_estimasi_tiba: string;
  tanggal_aktual_tiba: string;
  status: DeliveryStatus;
  created_at: string;
}

export default function DeliveryListPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  useEffect(() => {
    fetchDeliveries();
  }, [page, statusFilter]);

  async function fetchDeliveries() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/purchasing/delivery?${params}`);
      const data = await res.json();
      if (data.data) {
        setDeliveries(data.data);
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
          { label: "Pengiriman" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengiriman</h1>
          <p className="text-sm text-gray-500">Pantau pengiriman dari supplier</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari no. surat jalan, no. resi..."
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
              <SelectItem value="shipped">Dikirim</SelectItem>
              <SelectItem value="in_transit">Dalam Perjalanan</SelectItem>
              <SelectItem value="delivered">Tiba</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TruckIcon className="w-5 h-5" />
            Daftar Pengiriman
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["No. Surat Jalan", "PO", "Ekspedisi", "No. Resi", "Tgl Kirim", "Estimasi Tiba", "Status", "Aksi"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">Memuat...</td>
                  </tr>
                ) : deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <TruckIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Belum ada data pengiriman
                    </td>
                  </tr>
                ) : (
                  deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono font-medium">{d.no_surat_jalan}</td>
                      <td className="py-3 px-4 text-sm">{d.po_number || d.po_id}</td>
                      <td className="py-3 px-4 text-sm">{d.ekspedisi || "—"}</td>
                      <td className="py-3 px-4 text-sm font-mono text-xs">{d.no_resi || "—"}</td>
                      <td className="py-3 px-4 text-sm">{d.tanggal_kirim || "—"}</td>
                      <td className="py-3 px-4 text-sm">{d.tanggal_estimasi_tiba || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>
                          {STATUS_LABELS[d.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/purchasing/delivery/${d.id}`}>
                          <Button size="sm" variant="ghost"><EyeIcon className="w-4 h-4" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
