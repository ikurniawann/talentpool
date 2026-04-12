"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, CandidateStatus, Brand, Position } from "@/types";

const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "Baru",
  screening: "Screening",
  interview_hrd: "Interview HRD",
  interview_manager: "Interview Manager",
  talent_pool: "Talent Pool",
  hired: "Diterima",
  rejected: "Ditolak",
};

const SOURCE_LABELS: Record<string, string> = {
  portal: "Portal",
  internal: "Internal",
  referral: "Rekomendasi",
  jobstreet: "JobStreet",
  instagram: "Instagram",
  jobfair: "Job Fair",
  other: "Lainnya",
};

export default function CandidatesPage() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", brand_id: "", search: "" });
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("candidates")
      .select("*, brands(name), positions(title)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (filter.status) query = query.eq("status", filter.status);
    if (filter.brand_id) query = query.eq("brand_id", filter.brand_id);
    if (filter.search) {
      query = query.or(
        `full_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`
      );
    }

    const { data, count } = await query;
    setCandidates((data as Candidate[]) ?? []);
    setLoading(false);
  }, [filter, page]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    supabase.from("brands").select("*").eq("is_active", true).then(({ data }) => {
      if (data) setBrands(data);
    });
    supabase.from("positions").select("*").eq("is_active", true).then(({ data }) => {
      if (data) setPositions(data);
    });
  }, []);

  const handleStatusChange = async (candidateId: string, newStatus: CandidateStatus) => {
    await supabase
      .from("candidates")
      .update({ status: newStatus })
      .eq("id", candidateId);
    fetchCandidates();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kandidat</h1>
          <p className="text-gray-500 text-sm mt-1">
            Kelola semua kandidat yang melamar
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Cari nama, email, telepon..."
          value={filter.search}
          onChange={(e) => { setFilter((f) => ({ ...f, search: e.target.value })); setPage(1); }}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filter.status}
          onChange={(e) => { setFilter((f) => ({ ...f, status: e.target.value })); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={filter.brand_id}
          onChange={(e) => { setFilter((f) => ({ ...f, brand_id: e.target.value })); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Outlet</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Posisi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Outlet</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Sumber</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Memuat...
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada kandidat ditemukan
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{c.full_name}</p>
                        <p className="text-gray-500 text-xs">{c.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(c as any).positions?.title ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(c as any).brands?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {SOURCE_LABELS[c.source] ?? c.source}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        onChange={(e) =>
                          handleStatusChange(c.id, e.target.value as CandidateStatus)
                        }
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 focus:ring-1 focus:ring-blue-500 ${
                          c.status === "hired"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : c.status === "talent_pool"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Halaman {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={candidates.length < perPage}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
