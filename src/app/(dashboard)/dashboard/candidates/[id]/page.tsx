"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  Star,
  FileText,
  Image as ImageIcon,
  Edit2,
  Plus,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";
import type { Candidate, CandidateStatus, Brand, Position, Interview } from "@/types";
import { useForm } from "react-hook-form";

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
  walk_in: "Walk-in",
  internal_referral: "Referral Internal",
  headhunter: "Headhunter",
  other: "Lainnya",
};

const STATUS_COLORS: Record<CandidateStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  screening: "bg-yellow-100 text-yellow-700",
  interview_hrd: "bg-purple-100 text-purple-700",
  interview_manager: "bg-indigo-100 text-indigo-700",
  talent_pool: "bg-pink-100 text-pink-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const RECOMMENDATION_CONFIG = {
  proceed: { label: "Lanjut", color: "text-emerald-600", icon: CheckCircle2 },
  pool: { label: "Talent Pool", color: "text-yellow-600", icon: MinusCircle },
  reject: { label: "Ditolak", color: "text-red-600", icon: XCircle },
} as const;

type RecommendationKey = keyof typeof RECOMMENDATION_CONFIG;

const INTERVIEW_TYPE_LABELS = {
  hrd: "Interview HRD",
  hiring_manager: "Interview Manager",
};

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [candidateId, setCandidateId] = useState<string>("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load candidate ID from params
  useEffect(() => {
    params.then(({ id }) => setCandidateId(id));
  }, [params]);

  const fetchCandidate = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("candidates")
      .select("*, brands(name), positions(title)")
      .eq("id", id)
      .single();
    if (data) setCandidate(data as Candidate);
    setLoading(false);
  }, [supabase]);

  const fetchInterviews = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("interviews")
      .select("*, users(full_name)")
      .eq("candidate_id", id)
      .order("interview_date", { ascending: false });
    if (data) setInterviews(data as Interview[]);
  }, [supabase]);

  const fetchBrands = useCallback(async () => {
    const { data } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (data) setBrands(data);
  }, [supabase]);

  const fetchPositions = useCallback(async (brandId?: string | null) => {
    let q = supabase.from("positions").select("*").eq("is_active", true).order("title");
    if (brandId) q = q.eq("brand_id", brandId);
    const { data } = await q;
    if (data) setPositions(data);
  }, [supabase]);

  useEffect(() => {
    if (candidateId) {
      fetchCandidate(candidateId);
      fetchInterviews(candidateId);
      fetchBrands();
      fetchPositions();
    }
  }, [candidateId, fetchCandidate, fetchInterviews, fetchBrands, fetchPositions]);

  // Edit form
  type EditFormValues = {
    full_name: string;
    email: string;
    phone: string;
    domicile: string;
    source: string;
    brand_id: string;
    position_id: string;
    status: string;
    notes: string;
  };

  const editForm = useForm<EditFormValues>({
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      domicile: "",
      source: "",
      brand_id: "",
      position_id: "",
      status: "new",
      notes: "",
    },
  });

  useEffect(() => {
    if (candidate) {
      editForm.reset({
        full_name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        domicile: candidate.domicile,
        source: candidate.source,
        brand_id: candidate.brand_id ?? "",
        position_id: candidate.position_id ?? "",
        status: candidate.status,
        notes: candidate.notes ?? "",
      });
    }
  }, [candidate, editForm]);

  const handleSaveEdit = async (values: EditFormValues) => {
    setSaving(true);
    const { error } = await supabase
      .from("candidates")
      .update({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        domicile: values.domicile,
        source: values.source,
        brand_id: values.brand_id || null,
        position_id: values.position_id || null,
        status: values.status,
        notes: values.notes || null,
      })
      .eq("id", candidateId);

    setSaving(false);
    if (!error) {
      setEditOpen(false);
      fetchCandidate(candidateId);
    }
  };

  // Schedule interview form
  type ScheduleFormValues = {
    interview_date: string;
    interview_time: string;
    type: string;
    notes: string;
  };

  const scheduleForm = useForm<ScheduleFormValues>({
    defaultValues: { interview_date: "", interview_time: "", type: "hrd", notes: "" },
  });

  const handleScheduleInterview = async (values: ScheduleFormValues) => {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const interviewDateTime = `${values.interview_date}T${values.interview_time || "00:00"}:00`;

    const { error } = await supabase.from("interviews").insert({
      candidate_id: candidateId,
      interviewer_id: userData.user?.id ?? null,
      interview_date: interviewDateTime,
      type: values.type as "hrd" | "hiring_manager",
      notes: values.notes || null,
    });

    setSaving(false);
    if (!error) {
      setScheduleOpen(false);
      scheduleForm.reset();
      fetchInterviews(candidateId);
      // Update candidate status if it's still "new"
      if (candidate?.status === "new") {
        await supabase
          .from("candidates")
          .update({ status: "screening" })
          .eq("id", candidateId);
        fetchCandidate(candidateId);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Kandidat tidak ditemukan</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
      </div>
    );
  }

  const candidateBrand = (candidate as any).brands as { name: string } | undefined;
  const candidatePosition = (candidate as any).positions as { title: string } | undefined;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{candidate.full_name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge className={STATUS_COLORS[candidate.status]}>
              {STATUS_LABELS[candidate.status]}
            </Badge>
            {candidateBrand?.name && (
              <span className="text-gray-500 text-sm">{candidateBrand.name}</span>
            )}
            {candidatePosition?.title && (
              <span className="text-gray-500 text-sm">· {candidatePosition.title}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button onClick={() => setScheduleOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Jadwalkan Interview
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile & Files */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Profil Kandidat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex justify-center">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={candidate.photo_url ?? undefined} />
                  <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
                    {candidate.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <a href={`mailto:${candidate.email}`} className="hover:text-blue-600">
                    {candidate.email}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <a href={`https://wa.me/${candidate.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                    {candidate.phone}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{candidate.domicile}</span>
                </div>
                <Separator />
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  <span>{candidateBrand?.name ?? "-"}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Briefcase className="w-4 h-4 flex-shrink-0" />
                  <span>{candidatePosition?.title ?? "-"}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Star className="w-4 h-4 flex-shrink-0" />
                  <span>{SOURCE_LABELS[candidate.source] ?? candidate.source}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {new Date(candidate.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files Card */}
          {(candidate.cv_url || candidate.photo_url) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  File Lampiran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidate.cv_url && (
                  <a
                    href={candidate.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">CV / Resume</p>
                      <p className="text-xs text-gray-500">Klik untuk melihat</p>
                    </div>
                  </a>
                )}
                {candidate.photo_url && (
                  <a
                    href={candidate.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pas Foto</p>
                      <p className="text-xs text-gray-500">Klik untuk melihat</p>
                    </div>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {candidate.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{candidate.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="interviews" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="interviews">Interview ({interviews.length})</TabsTrigger>
              <TabsTrigger value="activity">Aktivitas</TabsTrigger>
            </TabsList>

            <TabsContent value="interviews">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Riwayat Interview</CardTitle>
                    <Button size="sm" onClick={() => setScheduleOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Tambah
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {interviews.length === 0 ? (
                    <div className="text-center py-10">
                      <Clock className="w-10 h-10 text-gray-300 mx-auto" />
                      <p className="mt-3 text-gray-500 text-sm">Belum ada interview terjadwal</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setScheduleOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Jadwalkan Interview
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {interviews.map((interview) => {
                        const rec = interview.recommendation
                          ? RECOMMENDATION_CONFIG[interview.recommendation]
                          : null;
                        const RecIcon = rec?.icon;
                        return (
                          <div
                            key={interview.id}
                            className="border border-gray-200 rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {INTERVIEW_TYPE_LABELS[interview.type] ?? interview.type}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(interview.interview_date).toLocaleDateString(
                                      "id-ID",
                                      {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )}
                                  </span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    {(interview as any).users?.full_name ?? "HRD"}
                                  </span>
                                </div>
                              </div>
                              {rec && (
                                <Badge
                                  variant="outline"
                                  className={`flex items-center gap-1 ${rec.color}`}
                                >
                                  {React.createElement(rec.icon as LucideIcon, { className: "w-3 h-3" })}
                                  {rec.label}
                                </Badge>
                              )}
                            </div>

                            {/* Scorecard */}
                            {interview.scorecard && (
                              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Scorecard
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {Object.entries(interview.scorecard)
                                    .filter(([key]) => !["notes"].includes(key))
                                    .map(([key, value]) => (
                                      <div key={key} className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 capitalize">
                                          {key.replace(/_/g, " ")}
                                        </span>
                                        {typeof value === "number" ? (
                                          <span className="text-sm font-medium text-gray-900">
                                            {"★".repeat(value)}
                                            {"☆".repeat(5 - value)}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-gray-500">
                                            {String(value)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                </div>
                                {interview.scorecard.notes && (
                                  <p className="text-xs text-gray-600 italic mt-2">
                                    "{interview.scorecard.notes}"
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Notes */}
                            {interview.notes && !interview.scorecard && (
                              <p className="text-sm text-gray-600 italic">{interview.notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Aktivitas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Kandidat ditambahkan</p>
                        <p className="text-xs text-gray-500">
                          {new Date(candidate.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    {candidate.status !== "new" && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Status diubah ke{" "}
                            <Badge className={`ml-1 ${STATUS_COLORS[candidate.status]}`}>
                              {STATUS_LABELS[candidate.status]}
                            </Badge>
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(candidate.updated_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                    {interviews.map((iv) => (
                      <div key={iv.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {INTERVIEW_TYPE_LABELS[iv.type] ?? iv.type}
                            {iv.recommendation && (
                              <span className="ml-1 text-gray-500 font-normal">
                                — {RECOMMENDATION_CONFIG[iv.recommendation]?.label}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(iv.interview_date).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Kandidat</DialogTitle>
            <DialogDescription>Ubah informasi kandidat di bawah ini.</DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(handleSaveEdit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nama Lengkap</Label>
                <Input {...editForm.register("full_name")} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...editForm.register("email")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>No. WhatsApp</Label>
                <Input {...editForm.register("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label>Domisili</Label>
                <Input {...editForm.register("domicile")} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Outlet</Label>
                <Select
                  value={editForm.watch("brand_id") || ""}
                  onValueChange={(v) => {
                    editForm.setValue("brand_id", v || "");
                    editForm.setValue("position_id", "");
                    fetchPositions(v || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Posisi</Label>
                <Select
                  value={editForm.watch("position_id") || ""}
                  onValueChange={(v) => editForm.setValue("position_id", v || "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Posisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sumber</Label>
                <Select
                  value={editForm.watch("source") || "other"}
                  onValueChange={(v) => editForm.setValue("source", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editForm.watch("status") || "new"}
                  onValueChange={(v) => editForm.setValue("status", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea {...editForm.register("notes")} rows={3} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Sheet */}
      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Jadwalkan Interview</SheetTitle>
            <SheetDescription>
              Atur jadwal interview untuk {candidate.full_name}.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={scheduleForm.handleSubmit(handleScheduleInterview)} className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Tipe Interview</Label>
              <Select
                value={scheduleForm.watch("type") || "hrd"}
                onValueChange={(v) => scheduleForm.setValue("type", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hrd">Interview HRD</SelectItem>
                  <SelectItem value="hiring_manager">Interview Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" {...scheduleForm.register("interview_date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Jam</Label>
                <Input type="time" {...scheduleForm.register("interview_time")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                {...scheduleForm.register("notes")}
                rows={3}
                placeholder="Catatan untuk interview..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Jadwal"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
