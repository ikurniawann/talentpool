"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, PipelineStage } from "@/types";

const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: "new", label: "Baru", color: "bg-blue-100 border-blue-300" },
  { id: "screening", label: "Screening", color: "bg-cyan-100 border-cyan-300" },
  { id: "interview_hrd", label: "Interview HRD", color: "bg-purple-100 border-purple-300" },
  { id: "interview_manager", label: "Interview Manager", color: "bg-orange-100 border-orange-300" },
  { id: "talent_pool", label: "Talent Pool", color: "bg-yellow-100 border-yellow-300" },
  { id: "hired", label: "Diterima", color: "bg-emerald-100 border-emerald-300" },
  { id: "rejected", label: "Ditolak", color: "bg-red-100 border-red-300" },
];

export default function PipelinePage() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidates = useCallback(async () => {
    const { data } = await supabase
      .from("candidates")
      .select("*, brands(name), positions(title)")
      .order("updated_at", { ascending: false });
    setCandidates((data as Candidate[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const getCandidatesForStage = (stage: PipelineStage) =>
    candidates.filter((c) => c.status === stage);

  const handleDrop = async (candidateId: string, newStatus: PipelineStage) => {
    await supabase
      .from("candidates")
      .update({ status: newStatus })
      .eq("id", candidateId);
    fetchCandidates();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Rekrutmen</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tarik & lepas kandidat antar tahapan
        </p>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageCandidates = getCandidatesForStage(stage.id);
          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 w-72 rounded-xl border-2 ${stage.color.split(" ")[1]} bg-white`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("candidateId");
                if (id) handleDrop(id, stage.id);
              }}
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-800">{stage.label}</h3>
                <span className="text-xs bg-white px-2 py-0.5 rounded-full font-medium text-gray-600">
                  {stageCandidates.length}
                </span>
              </div>
              <div className="p-3 space-y-2 min-h-32 max-h-96 overflow-y-auto">
                {stageCandidates.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("candidateId", c.id);
                    }}
                    className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <p className="font-medium text-gray-900 text-sm">{c.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(c as any).positions?.title ?? "Tanpa Posisi"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(c as any).brands?.name ?? "Semua Outlet"}
                    </p>
                    <div className="mt-2 flex gap-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                        {c.source}
                      </span>
                    </div>
                  </div>
                ))}
                {stageCandidates.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">
                    Kosong
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
