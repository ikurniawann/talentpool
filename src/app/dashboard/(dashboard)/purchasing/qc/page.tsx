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
  BeakerIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

type QCStatus = "pending" | "passed" | "rejected" | "partial";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  passed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  partial: "bg-blue-100 text-blue-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu QC",
  passed: "Lulus",
  rejected: "Ditolak",
  partial: "Sebagian",
};

export default function QCListPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  useEffect(() => {
    fetchQC();
  }, [page]);

  async function fetchQC() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);

      const res = await fetch(`/api/purchasing/qc?${params}`);
      const data = await res.json();
      if (data.data) {
        setRecords(data.data);
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
          { label: "Quality Control" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Control</h1>
          <p className="text-sm text-gray-500">Inspeksi &amp; kualitas bahan baku</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari hasil QC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BeakerIcon className="w-5 h-5" />
            Daftar QC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["No. QC", "GRN", "Bahan Baku", "Jumlah Diperiksa", "Diterima", "Ditolak", "Hasil", "Tanggal", "Aksi"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">Memuat...</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <BeakerIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      Belum ada data QC
                    </td>
                  </tr>
                ) : (
                  records.map((q) => {
                    const first = q.items?.[0] || {};
                    return (
                      <tr key={q.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-mono font-medium">{q.qc_number || q.id.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-sm">{q.grn_id?.slice(0, 8) || "—"}</td>
                        <td className="py-3 px-4 text-sm">{first.bahan_baku_id || "—"}</td>
                        <td className="py-3 px-4 text-sm text-center">{first.jumlah_diperiksa ?? "—"}</td>
                        <td className="py-3 px-4 text-sm text-center text-green-600">{first.jumlah_diterima ?? "—"}</td>
                        <td className="py-3 px-4 text-sm text-center text-red-600">{first.jumlah_ditolak ?? "—"}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[q.hasil] || "bg-gray-100"}`}>
                            {STATUS_LABELS[q.hasil] || q.hasil}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{q.tanggal_inspeksi || q.created_at?.slice(0, 10) || "—"}</td>
                        <td className="py-3 px-4">
                          <Link href={`/dashboard/purchasing/qc/${q.id}`}>
                            <Button size="sm" variant="ghost"><EyeIcon className="w-4 h-4" /></Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
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
