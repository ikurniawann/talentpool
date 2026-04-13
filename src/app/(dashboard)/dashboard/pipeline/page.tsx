"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Candidate, PipelineStage, Brand } from "@/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";

const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: "new", label: "Baru", color: "bg-blue-100 border-blue-300" },
  { id: "screening", label: "Screening", color: "bg-cyan-100 border-cyan-300" },
  { id: "interview_hrd", label: "Interview HRD", color: "bg-purple-100 border-purple-300" },
  { id: "interview_manager", label: "Interview Manager", color: "bg-orange-100 border-orange-300" },
  { id: "talent_pool", label: "Talent Pool", color: "bg-yellow-100 border-yellow-300" },
  { id: "hired", label: "Diterima", color: "bg-emerald-100 border-emerald-300" },
  { id: "rejected", label: "Ditolak", color: "bg-red-100 border-red-300" },
];

function getDaysInStage(updatedAt: string): number {
  const updated = new Date(updatedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - updated.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getCardHighlight(daysInStage: number): string {
  if (daysInStage > 14) return "border-2 border-red-400 bg-red-50";
  if (daysInStage > 7) return "border-2 border-yellow-400 bg-yellow-50";
  return "";
}

export default function PipelinePage() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [rejectedCollapsed, setRejectedCollapsed] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchCandidates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("candidates")
        .select("*, brands(name), positions(title)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setCandidates((data as Candidate[]) ?? []);
    } catch (e) {
      console.error("Error fetching candidates:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setBrands((data as Brand[]) ?? []);
    } catch (e) {
      console.error("Error fetching brands:", e);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    fetchBrands();
  }, [fetchCandidates, fetchBrands]);

  const filteredCandidates =
    selectedBrand === "all"
      ? candidates
      : candidates.filter((c) => c.brand_id === selectedBrand);

  const getCandidatesForStage = (stage: PipelineStage) =>
    filteredCandidates.filter((c) => c.status === stage);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId as PipelineStage;

    // Optimistic update
    setCandidates((prev) =>
      prev.map((c) =>
        c.id === draggableId
          ? { ...c, status: newStatus, updated_at: new Date().toISOString() }
          : c
      )
    );

    try {
      const { error } = await supabase
        .from("candidates")
        .update({ status: newStatus })
        .eq("id", draggableId);
      if (error) throw error;
    } catch (e) {
      console.error("Error updating candidate status:", e);
      // Revert on error
      fetchCandidates();
    }
  };

  const handleCardClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setSheetOpen(true);
  };

  const openStages = STAGES.filter((s) => s.id !== "rejected");
  const rejectedStage = STAGES.find((s) => s.id === "rejected")!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Rekrutmen</h1>
        <p className="text-gray-500 text-sm mt-1">
          Tarik & lepas kandidat antar tahapan
        </p>
      </div>

      {/* Brand Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter Brand:</label>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Semua Brand</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {openStages.map((stage) => {
            const stageCandidates = getCandidatesForStage(stage.id);
            return (
              <Droppable droppableId={stage.id} key={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-[260px] sm:w-72 rounded-xl border-2 ${stage.color.split(" ")[1]} bg-white transition-colors ${
                      snapshot.isDraggingOver ? "ring-2 ring-blue-400 ring-opacity-50" : ""
                    }`}
                  >
                    <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-xs sm:text-sm text-gray-800">
                        {stage.label}
                      </h3>
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full font-medium text-gray-600 shadow-sm">
                        {stageCandidates.length}
                      </span>
                    </div>
                    <div className="p-2 sm:p-3 space-y-2 min-h-24 max-h-64 sm:max-h-96 overflow-y-auto">
                      {stageCandidates.map((c, index) => {
                        const daysInStage = getDaysInStage(c.updated_at);
                        const highlight = getCardHighlight(daysInStage);
                        return (
                          <Draggable draggableId={c.id} index={index} key={c.id}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => handleCardClick(c)}
                                className={`bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                                  snapshot.isDragging ? "shadow-lg ring-2 ring-blue-400" : ""
                                } ${highlight}`}
                              >
                                <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                                  {c.full_name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                                  {(c as any).positions?.title ?? "Tanpa Posisi"}
                                </p>
                                <p className="text-xs text-gray-400 hidden sm:block">
                                  {(c as any).brands?.name ?? "Semua Outlet"}
                                </p>
                                <div className="mt-2 flex gap-1 flex-wrap">
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                    {c.source}
                                  </span>
                                </div>
                                {daysInStage > 7 && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {daysInStage} hari di stage
                                  </p>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {stageCandidates.length === 0 && (
                        <p className="text-center text-xs text-gray-400 py-4">
                          Kosong
                        </p>
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}

          {/* Collapsible Rejected Column */}
          <div
            className={`flex-shrink-0 rounded-xl border-2 ${rejectedCollapsed ? "w-12" : "w-[260px] sm:w-72"} border-red-300 bg-red-50 transition-all duration-200`}
          >
            <div
              className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer"
              onClick={() => setRejectedCollapsed(!rejectedCollapsed)}
            >
              <div className="flex items-center gap-2">
                {rejectedCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                )}
                {!rejectedCollapsed && (
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-800">
                    {rejectedStage.label}
                  </h3>
                )}
              </div>
              {!rejectedCollapsed && (
                <span className="text-xs bg-white px-2 py-0.5 rounded-full font-medium text-gray-600 shadow-sm">
                  {getCandidatesForStage("rejected").length}
                </span>
              )}
              {rejectedCollapsed && (
                <span className="text-xs bg-white px-1.5 py-0.5 rounded-full font-medium text-gray-600 shadow-sm">
                  {getCandidatesForStage("rejected").length}
                </span>
              )}
            </div>
            {!rejectedCollapsed && (
              <Droppable droppableId="rejected">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-2 sm:p-3 space-y-2 min-h-24 max-h-64 sm:max-h-96 overflow-y-auto transition-colors ${
                      snapshot.isDraggingOver ? "ring-2 ring-blue-400 ring-opacity-50" : ""
                    }`}
                  >
                    {getCandidatesForStage("rejected").map((c, index) => {
                      const daysInStage = getDaysInStage(c.updated_at);
                      const highlight = getCardHighlight(daysInStage);
                      return (
                        <Draggable draggableId={c.id} index={index} key={c.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => handleCardClick(c)}
                              className={`bg-white rounded-lg border border-gray-200 p-2.5 sm:p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                                snapshot.isDragging ? "shadow-lg ring-2 ring-blue-400" : ""
                              } ${highlight}`}
                            >
                              <p className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                                {c.full_name}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                                {(c as any).positions?.title ?? "Tanpa Posisi"}
                              </p>
                              <p className="text-xs text-gray-400 hidden sm:block">
                                {(c as any).brands?.name ?? "Semua Outlet"}
                              </p>
                              <div className="mt-2 flex gap-1 flex-wrap">
                                <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                  {c.source}
                                </span>
                              </div>
                              {daysInStage > 7 && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {daysInStage} hari di stage
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {getCandidatesForStage("rejected").length === 0 && (
                      <p className="text-center text-xs text-gray-400 py-4">
                        Kosong
                      </p>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* Candidate Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="sm:max-w-sm">
          {selectedCandidate && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCandidate.full_name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 px-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Informasi Kandidat
                  </p>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email</span>
                      <span className="text-sm text-gray-900">
                        {selectedCandidate.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Telepon</span>
                      <span className="text-sm text-gray-900">
                        {selectedCandidate.phone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Domisili</span>
                      <span className="text-sm text-gray-900">
                        {selectedCandidate.domicile}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Sumber</span>
                      <span className="text-sm text-gray-900 capitalize">
                        {selectedCandidate.source}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Brand</span>
                      <span className="text-sm text-gray-900">
                        {(selectedCandidate as any).brands?.name ?? "Semua Outlet"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Posisi</span>
                      <span className="text-sm text-gray-900">
                        {(selectedCandidate as any).positions?.title ?? "Tanpa Posisi"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Stage</span>
                      <span className="text-sm text-gray-900 capitalize">
                        {STAGES.find((s) => s.id === selectedCandidate.status)?.label ??
                          selectedCandidate.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Hari di Stage</span>
                      <span className="text-sm text-gray-900">
                        {getDaysInStage(selectedCandidate.updated_at)} hari
                      </span>
                    </div>
                  </div>
                </div>

                {selectedCandidate.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Catatan
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      {selectedCandidate.notes}
                    </p>
                  </div>
                )}

                <div className="pt-4">
                  <Link
                    href={`/dashboard/candidates/${selectedCandidate.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                  >
                    Lihat Detail
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
