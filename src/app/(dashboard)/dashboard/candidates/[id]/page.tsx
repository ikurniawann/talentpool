"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
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
  ClipboardList,
  type LucideIcon,
  Video,
  MapPin as MapPinIcon,
} from "lucide-react";
import type { Candidate, CandidateStatus, Brand, Position, Interview, User as UserType } from "@/types";
import { useForm } from "react-hook-form";
import ScorecardDialog from "@/components/scorecard-dialog";

const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "Baru",
  screening: "Screening",
  interview_hrd: "Interview HRD",
  interview_manager: "Interview Manager",
  talent_pool: "Talent Pool",
  hired: "Diterima",
  rejected: "Ditolak",
  archived: "Diarsipkan",
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
  archived: "bg-gray-100 text-gray-700",
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

export default function CandidateDetailPage() {
  const router = useRouter();
  const supabase = createClient();
  const params = useParams();
  const candidateId = params.id as string;
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [interviewers, setInterviewers] = useState<UserType[]>([]);
  const [editInterviewOpen, setEditInterviewOpen] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingInterviewId, setDeletingInterviewId] = useState<string | null>(null);



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

  const fetchInterviewers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("role", ["hrd", "hiring_manager"])
        .order("full_name", { ascending: true, nullsFirst: false });

      if (error) {
        console.error("Error fetching interviewers:", error);
        // Try alternative - order by id if full_name fails
        const { data: altData } = await supabase
          .from("users")
          .select("*")
          .in("role", ["hrd", "hiring_manager"])
          .order("id");
        if (altData) setInterviewers(altData as UserType[]);
        return;
      }
      if (data) setInterviewers(data as UserType[]);
    } catch (e) {
      console.error("Exception fetching interviewers:", e);
    }
  }, [supabase]);

  useEffect(() => {
    if (candidateId) {
      fetchCandidate(candidateId);
      fetchInterviews(candidateId);
      fetchBrands();
      fetchPositions();
      fetchInterviewers();
    }
  }, [candidateId, fetchCandidate, fetchInterviews, fetchBrands, fetchPositions, fetchInterviewers]);

  // Reset schedule form when dialog opens
  useEffect(() => {
    if (scheduleOpen) {
      scheduleForm.reset({
        interview_date: "",
        interview_time: "",
        type: "hrd",
        interviewer_id: "",
        mode: "offline",
        meeting_link: "",
        notes: "",
        send_notification: false,
      });
    }
  }, [scheduleOpen]);

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

  const handleScorecardSaved = async () => {
    fetchInterviews(candidateId);
    fetchCandidate(candidateId);
  };

  const handleInterviewClick = (interview: Interview) => {
    setSelectedInterview(interview);
    setScorecardOpen(true);
  };

  // Edit interview form
  type EditInterviewFormValues = {
    interview_date: string;
    interview_time: string;
    type: string;
    interviewer_id: string;
    mode: "offline" | "online";
    meeting_link: string;
    notes: string;
  };

  const editInterviewForm = useForm<EditInterviewFormValues>({
    defaultValues: {
      interview_date: "",
      interview_time: "",
      type: "hrd",
      interviewer_id: "",
      mode: "offline",
      meeting_link: "",
      notes: "",
    },
  });

  // Open edit dialog with interview data
  const handleEditInterview = (interview: Interview) => {
    const dateObj = new Date(interview.interview_date);
    const dateStr = dateObj.toISOString().split("T")[0];
    const timeStr = dateObj.toTimeString().slice(0, 5);

    setEditingInterview(interview);
    editInterviewForm.reset({
      interview_date: dateStr,
      interview_time: timeStr,
      type: interview.type,
      interviewer_id: (interview as any).interviewer_id || "",
      mode: interview.mode || "offline",
      meeting_link: interview.meeting_link || "",
      notes: interview.notes || "",
    });
    setEditInterviewOpen(true);
  };

  // Handle update interview
  const handleUpdateInterview = async (values: EditInterviewFormValues) => {
    if (!editingInterview) return;

    setSaving(true);
    const interviewDateTime = `${values.interview_date}T${values.interview_time || "00:00"}:00`;

    const updateData: Record<string, unknown> = {
      interview_date: interviewDateTime,
      type: values.type as "hrd" | "hiring_manager",
      mode: values.mode,
      notes: values.notes || null,
    };

    if (values.interviewer_id && values.interviewer_id.trim() !== "") {
      updateData.interviewer_id = values.interviewer_id;
    }

    if (values.mode === "online" && values.meeting_link) {
      updateData.meeting_link = values.meeting_link;
    } else if (values.mode === "offline") {
      updateData.meeting_link = null;
    }

    const { error } = await supabase
      .from("interviews")
      .update(updateData)
      .eq("id", editingInterview.id);

    if (error) {
      console.error("Error updating interview:", error);
      alert(`Gagal mengupdate jadwal: ${error.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditInterviewOpen(false);
    setEditingInterview(null);
    editInterviewForm.reset();
    fetchInterviews(candidateId);
  };

  // Handle delete interview
  const handleDeleteInterview = async () => {
    if (!deletingInterviewId) return;

    setSaving(true);
    const { error } = await supabase
      .from("interviews")
      .delete()
      .eq("id", deletingInterviewId);

    if (error) {
      console.error("Error deleting interview:", error);
      alert(`Gagal menghapus interview: ${error.message}`);
    }

    setSaving(false);
    setDeleteConfirmOpen(false);
    setDeletingInterviewId(null);
    fetchInterviews(candidateId);
  };

  // Schedule interview form
  type ScheduleFormValues = {
    interview_date: string;
    interview_time: string;
    type: string;
    interviewer_id: string;
    mode: "offline" | "online";
    meeting_link: string;
    notes: string;
    send_notification: boolean;
  };

  const scheduleForm = useForm<ScheduleFormValues>({
    defaultValues: {
      interview_date: "",
      interview_time: "",
      type: "hrd",
      interviewer_id: "",
      mode: "offline",
      meeting_link: "",
      notes: "",
      send_notification: false,
    },
  });

  const handleScheduleInterview = async (values: ScheduleFormValues) => {
    // Validate required fields
    if (!values.interview_date) {
      alert("Tanggal interview harus diisi");
      return;
    }

    setSaving(true);
    const interviewDateTime = `${values.interview_date}T${values.interview_time || "09:00"}:00`;

    // Get authenticated user for interviewer_id fallback
    const { data: authUser } = await supabase.auth.getUser();
    const interviewerId = values.interviewer_id?.trim() || authUser?.user?.id;

    if (!interviewerId) {
      alert("Interviewer harus dipilih atau Anda harus login");
      setSaving(false);
      return;
    }

    // Build insert object - only columns that exist in schema
    const insertData = {
      candidate_id: candidateId,
      interviewer_id: interviewerId,
      interview_date: interviewDateTime,
      type: values.type as "hrd" | "hiring_manager",
      notes: values.notes || null,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("interviews")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Error scheduling interview:", insertError);
      alert(`Gagal menyimpan jadwal: ${insertError.message}`);
      setSaving(false);
      return;
    }

    // Re-fetch candidate to get LATEST status from DB (avoid stale state)
    const { data: freshCandidate } = await supabase
      .from("candidates")
      .select("status")
      .eq("id", candidateId)
      .single();

    const currentStatus = freshCandidate?.status || candidate?.status || "new";
    const interviewType = values.type as "hrd" | "hiring_manager";

    // Advance candidate status based on current status and interview type
    let newStatus: string | null = null;
    if (currentStatus === "new") {
      newStatus = "screening";
    } else if (currentStatus === "screening" && interviewType === "hrd") {
      newStatus = "interview_hrd";
    } else if (currentStatus === "screening" && interviewType === "hiring_manager") {
      newStatus = "interview_manager";
    } else if (currentStatus === "interview_hrd" && interviewType === "hiring_manager") {
      newStatus = "interview_manager";
    }
    // interview_manager, talent_pool, hired, rejected, archived = no change

    if (newStatus && newStatus !== currentStatus) {
      const { error: statusError } = await supabase
        .from("candidates")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", candidateId);

      if (statusError) {
        console.error("Status update error:", statusError);
      }
    }

    // Send notification if checked
    if (values.send_notification && candidate) {
      const interviewTypeLabel = values.type === "hrd" ? "Interview HRD" : "Interview Manager";
      const dateStr = new Date(interviewDateTime).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      let message = `Halo ${candidate.full_name}, jadwal interview telah ditentukan:\n\n📅 *${interviewTypeLabel}*\n🗓️ Tanggal: ${dateStr}`;
      message += `\n\nMohon konfirmasi kehadiran. Terima kasih!`;

      await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          channel: "whatsapp",
          message,
        }),
      }).catch(() => {}); // Don't fail the whole flow if notification fails
    }

    // Refresh data and close
    await fetchInterviews(candidateId);
    await fetchCandidate(candidateId);

    setSaving(false);
    scheduleForm.reset(); // Reset form BEFORE closing dialog
    setScheduleOpen(false);
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
  const positionTitle = candidatePosition?.title;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="flex-shrink-0 mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{candidate.full_name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={`${STATUS_COLORS[candidate.status]} text-xs`}>
              {STATUS_LABELS[candidate.status]}
            </Badge>
            {candidateBrand?.name && (
              <span className="text-gray-500 text-xs sm:text-sm">{candidateBrand.name}</span>
            )}
            {candidatePosition?.title && (
              <span className="text-gray-500 text-xs sm:text-sm">· {candidatePosition.title}</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons — full width on mobile */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="flex-1 sm:flex-none">
          <Edit2 className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="sm:hidden">Edit</span>
          <span className="hidden sm:inline">Edit Kandidat</span>
        </Button>
        <Button size="sm" onClick={() => setScheduleOpen(true)} className="flex-1 sm:flex-none">
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="sm:hidden">Jadwalkan</span>
          <span className="hidden sm:inline">Jadwalkan Interview</span>
        </Button>
        <a
          href={`https://wa.me/${candidate.phone.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-green-200 bg-background hover:bg-green-50 text-green-600 text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 h-7 gap-1 rounded-[min(0.5rem,12px)] px-2.5 text-[0.8rem] flex-1 sm:flex-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1 sm:mr-2">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span className="sm:hidden">WA</span>
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                        const isOnline = interview.mode === "online";
                        return (
                          <div
                            key={interview.id}
                            className="border border-gray-200 rounded-lg p-4 space-y-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
                            onClick={() => handleInterviewClick(interview)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {INTERVIEW_TYPE_LABELS[interview.type] ?? interview.type}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
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
                                  <span className="flex items-center gap-1">
                                    {isOnline ? (
                                      <Video className="w-3.5 h-3.5 text-blue-500" />
                                    ) : (
                                      <MapPinIcon className="w-3.5 h-3.5" />
                                    )}
                                    {isOnline ? "Online" : "Offline"}
                                  </span>
                                  <span>·</span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    {(interview as any).users?.full_name ?? "HRD"}
                                  </span>
                                </div>
                                {isOnline && interview.meeting_link && (
                                  <a
                                    href={interview.meeting_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Video className="w-3 h-3" />
                                    {interview.meeting_link}
                                  </a>
                                )}
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
                                    &ldquo;{interview.scorecard.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Notes */}
                            {interview.notes && !interview.scorecard && (
                              <p className="text-sm text-gray-600 italic">{interview.notes}</p>
                            )}

                            {/* Fill Scorecard Button */}
                            {!interview.scorecard && (
                              <div className="pt-2 border-t border-gray-100">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInterviewClick(interview);
                                  }}
                                >
                                  <ClipboardList className="w-4 h-4 mr-1" />
                                  Isi Scorecard
                                </Button>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 border-t border-gray-100 flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-500 hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditInterview(interview);
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingInterviewId(interview.id);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Hapus
                              </Button>
                            </div>
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
                    <SelectValue>
                      {brands.find(b => b.id === editForm.watch("brand_id"))?.name || "Pilih Outlet"}
                    </SelectValue>
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
                    <SelectValue>
                      {positions.find(p => p.id === editForm.watch("position_id"))?.title || "Pilih Posisi"}
                    </SelectValue>
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
                    <SelectValue>
                      {SOURCE_LABELS[editForm.watch("source") as string] || editForm.watch("source")}
                    </SelectValue>
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
                    <SelectValue>
                      {STATUS_LABELS[editForm.watch("status") as CandidateStatus] || editForm.watch("status")}
                    </SelectValue>
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

      {/* Schedule Interview Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Jadwalkan Interview</DialogTitle>
            <DialogDescription>
              Atur jadwal interview untuk {candidate.full_name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={scheduleForm.handleSubmit(handleScheduleInterview)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipe Interview</Label>
              <Select
                value={scheduleForm.watch("type") || "hrd"}
                onValueChange={(v) => scheduleForm.setValue("type", v as any)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {scheduleForm.watch("type") === "hiring_manager" ? "Interview Manager" : "Interview HRD"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hrd">Interview HRD</SelectItem>
                  <SelectItem value="hiring_manager">Interview Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Interviewer</Label>
              <Select
                value={scheduleForm.watch("interviewer_id") || ""}
                onValueChange={(v) => scheduleForm.setValue("interviewer_id", v || "")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {interviewers.find(iv => iv.id === scheduleForm.watch("interviewer_id"))?.full_name || "Pilih Interviewer (opsional)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {interviewers.length === 0 && (
                    <SelectItem value="" disabled>Tidak ada interviewer</SelectItem>
                  )}
                  {interviewers.map((iv) => (
                    <SelectItem key={iv.id} value={iv.id}>
                      <span>{iv.full_name || iv.email || iv.id.slice(0, 8)}</span>
                      <span className="text-gray-400 text-xs ml-1">({iv.role === "hrd" ? "HRD" : "Manager"})</span>
                    </SelectItem>
                  ))}
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
              <Label>Mode Interview</Label>
              <Select
                value={scheduleForm.watch("mode") || "offline"}
                onValueChange={(v) => scheduleForm.setValue("mode", v as "offline" | "online")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {scheduleForm.watch("mode") === "online" ? "Online (Zoom/Google Meet)" : "Offline (Tatap Muka)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">
                    <span className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4" /> Offline (Tatap Muka)
                    </span>
                  </SelectItem>
                  <SelectItem value="online">
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4" /> Online (Zoom/Google Meet)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduleForm.watch("mode") === "online" && (
              <div className="space-y-1.5">
                <Label>
                  Meeting Link <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...scheduleForm.register("meeting_link")}
                  placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                {...scheduleForm.register("notes")}
                rows={3}
                placeholder="Catatan untuk interview..."
              />
            </div>

            {/* Send notification checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="send_notification"
                className="mt-0.5 w-4 h-4 accent-blue-600"
                {...scheduleForm.register("send_notification")}
              />
              <label htmlFor="send_notification" className="text-sm text-gray-700 cursor-pointer">
                Kirim notifikasi WhatsApp ke kandidat setelah menyimpan jadwal
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  saving ||
                  !scheduleForm.watch("interview_date")
                }
              >
                {saving ? "Menyimpan..." : "Simpan Jadwal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Interview Dialog */}
      <Dialog open={editInterviewOpen} onOpenChange={setEditInterviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Jadwal Interview</DialogTitle>
            <DialogDescription>
              Ubah jadwal interview untuk {candidate?.full_name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editInterviewForm.handleSubmit(handleUpdateInterview)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipe Interview</Label>
              <Select
                value={editInterviewForm.watch("type") || "hrd"}
                onValueChange={(v) => editInterviewForm.setValue("type", v as any)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {editInterviewForm.watch("type") === "hiring_manager" ? "Interview Manager" : "Interview HRD"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hrd">Interview HRD</SelectItem>
                  <SelectItem value="hiring_manager">Interview Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Interviewer</Label>
              <Select
                value={editInterviewForm.watch("interviewer_id") || ""}
                onValueChange={(v) => editInterviewForm.setValue("interviewer_id", v || "")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {interviewers.find(iv => iv.id === editInterviewForm.watch("interviewer_id"))?.full_name || "Pilih Interviewer (opsional)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {interviewers.length === 0 && (
                    <SelectItem value="" disabled>Tidak ada interviewer</SelectItem>
                  )}
                  {interviewers.map((iv) => (
                    <SelectItem key={iv.id} value={iv.id}>
                      <span>{iv.full_name || iv.email || iv.id.slice(0, 8)}</span>
                      <span className="text-gray-400 text-xs ml-1">({iv.role === "hrd" ? "HRD" : "Manager"})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" {...editInterviewForm.register("interview_date")} />
              </div>
              <div className="space-y-1.5">
                <Label>Jam</Label>
                <Input type="time" {...editInterviewForm.register("interview_time")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Mode Interview</Label>
              <Select
                value={editInterviewForm.watch("mode") || "offline"}
                onValueChange={(v) => editInterviewForm.setValue("mode", v as "offline" | "online")}
              >
                <SelectTrigger>
                  <SelectValue>
                    {editInterviewForm.watch("mode") === "online" ? "Online (Zoom/Google Meet)" : "Offline (Tatap Muka)"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">
                    <span className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4" /> Offline (Tatap Muka)
                    </span>
                  </SelectItem>
                  <SelectItem value="online">
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4" /> Online (Zoom/Google Meet)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editInterviewForm.watch("mode") === "online" && (
              <div className="space-y-1.5">
                <Label>
                  Meeting Link <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...editInterviewForm.register("meeting_link")}
                  placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                {...editInterviewForm.register("notes")}
                rows={3}
                placeholder="Catatan untuk interview..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditInterviewOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving || !editInterviewForm.watch("interview_date")}>
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Interview Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Interview?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus interview ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={handleDeleteInterview}
            >
              {saving ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Scorecard Dialog */}
      <ScorecardDialog
        interview={selectedInterview}
        positionTitle={positionTitle}
        open={scorecardOpen}
        onOpenChange={setScorecardOpen}
        onSaved={handleScorecardSaved}
      />
    </div>
  );
}
