"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
import {
  BeakerIcon,
  MagnifyingGlassIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { X } from "lucide-react";

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
  const [total, setTotal] = useState(0);
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
        const totalRows = data.pagination?.total || 0;
        setTotal(totalRows);
        setTotalPages(Math.max(1, Math.ceil(totalRows / limit)));
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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

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

      <PurchasingListSection
        icon={BeakerIcon}
        title="Daftar QC"
        description="Pantau inspeksi QC, hasil penerimaan, dan dokumen GRN terkait."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:w-auto md:flex-row md:items-center">
            <label className="relative w-full md:w-80">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari hasil QC..."
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
            {(search || page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-9 flex-shrink-0">
                Reset
              </Button>
            )}
          </div>
        }
      >
        <div>
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    {["No. QC", "GRN", "Bahan Baku", "Jumlah Diperiksa", "Diterima", "Ditolak", "Hasil", "Tanggal", "Aksi"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((q) => {
                    const first = q.items?.[0] || {};
                    return (
                      <tr key={q.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm font-medium">{q.qc_number || q.id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-sm">{q.grn_id?.slice(0, 8) || "—"}</td>
                        <td className="px-4 py-3 text-sm">{first.bahan_baku_id || "—"}</td>
                        <td className="px-4 py-3 text-center text-sm">{first.jumlah_diperiksa ?? "—"}</td>
                        <td className="px-4 py-3 text-center text-sm text-green-600">{first.jumlah_diterima ?? "—"}</td>
                        <td className="px-4 py-3 text-center text-sm text-red-600">{first.jumlah_ditolak ?? "—"}</td>
                        <td className="px-4 py-3">
                          <Badge className={STATUS_COLORS[q.hasil] || "bg-gray-100"}>
                            {STATUS_LABELS[q.hasil] || q.hasil}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{q.tanggal_inspeksi || q.created_at?.slice(0, 10) || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/dashboard/purchasing/qc/${q.id}`}>
                            <Button size="sm" variant="ghost"><EyeIcon className="w-4 h-4" /></Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          <PurchasingTablePagination
            page={page}
            totalPages={Math.max(1, totalPages)}
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
