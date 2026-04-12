"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, CandidateStatus } from "@/types";

export default function TalentPoolPage() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("candidates")
      .select("*, brands(name), positions(title)")
      .eq("status", "talent_pool")
      .order("updated_at", { ascending: false });

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data } = await query;
    setCandidates((data as Candidate[]) ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const reactivate = async (candidateId: string) => {
    const newStatus = prompt(
      "Pindahkan ke status baru:\nnew, screening, interview_hrd, interview_manager, hired"
    ) as CandidateStatus;
    if (newStatus) {
      await supabase
        .from("candidates")
        .update({ status: newStatus })
        .eq("id", candidateId);
      fetchCandidates();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Talent Pool</h1>
          <p className="text-gray-500 text-sm mt-1">
            Kandidat potensial yang disimpan untuk kebutuhan mendatang
          </p>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
          {candidates.length} kandidat
        </span>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))
        ) : candidates.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-500">
            Tidak ada kandidat di talent pool
          </div>
        ) : (
          candidates.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.full_name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {(c as any).positions?.title ?? "Tanpa Posisi"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {(c as any).brands?.name ?? "Semua Outlet"}
                  </p>
                </div>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  ⭐ Pool
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-gray-600">
                <p>📧 {c.email}</p>
                <p>📱 {c.phone}</p>
                <p>📍 {c.domicile}</p>
              </div>

              {c.notes && (
                <p className="mt-3 text-xs text-gray-500 line-clamp-2">
                  📝 {c.notes}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => reactivate(c.id)}
                  className="flex-1 py-1.5 px-3 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                >
                  Aktifkan Kembali
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
