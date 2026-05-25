"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  BeakerIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

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

type QCRecord = {
  id: string;
  qc_number?: string | null;
  grn_id?: string | null;
  hasil?: string | null;
  tanggal_inspeksi?: string | null;
  created_at?: string | null;
  items?: Array<{
    bahan_baku_id?: string | null;
    jumlah_diperiksa?: number | null;
    jumlah_diterima?: number | null;
    jumlah_ditolak?: number | null;
  }>;
};

export default function QCListPage() {
  const [records, setRecords] = useState<QCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  const fetchQC = useCallback(async () => {
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
  }, [page, search]);

  useEffect(() => {
    fetchQC();
  }, [fetchQC]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchQuery.trim());
    setPage(1);
  }

  function handleResetFilters() {
    setSearch("");
    setSearchQuery("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Procurement", href: "/dashboard/purchasing/procurement" },
          { label: "Quality Control" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Control</h1>
          <p className="text-sm text-gray-500">Inspeksi &amp; kualitas bahan baku</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari hasil QC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-10 text-sm"
                />
              </div>
              <Button type="submit" variant="outline" className="h-9 flex-shrink-0">
                Cari
              </Button>
            </form>
            {(search || page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-9 flex-shrink-0">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BeakerIcon className="w-5 h-5" />
            Daftar QC
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-14 text-center">
              <BeakerIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Belum ada data QC</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {["No. QC", "GRN", "Bahan Baku", "Jumlah Diperiksa", "Diterima", "Ditolak", "Hasil", "Tanggal", "Aksi"].map((h) => (
                      <TableHead key={h} className="text-gray-900">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((q) => {
                    const first = q.items?.[0] || {};
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="text-sm font-mono font-medium">{q.qc_number || q.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm">{q.grn_id?.slice(0, 8) || "—"}</TableCell>
                        <TableCell className="text-sm">{first.bahan_baku_id || "—"}</TableCell>
                        <TableCell className="text-center text-sm">{first.jumlah_diperiksa ?? "—"}</TableCell>
                        <TableCell className="text-center text-sm text-green-600">{first.jumlah_diterima ?? "—"}</TableCell>
                        <TableCell className="text-center text-sm text-red-600">{first.jumlah_ditolak ?? "—"}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[q.hasil] || "bg-gray-100"}>
                            {STATUS_LABELS[q.hasil] || q.hasil}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{q.tanggal_inspeksi || q.created_at?.slice(0, 10) || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/purchasing/qc/${q.id}`}>
                            <Button size="sm" variant="ghost"><EyeIcon className="w-4 h-4" /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

          {totalPages > 1 && (
            <div className="border-t border-gray-200/70">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Sebelumnya</Button>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Berikutnya</Button>
              </div>
            </div>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
