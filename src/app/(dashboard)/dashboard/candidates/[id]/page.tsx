"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  Download,
  Edit3,
  MessageSquare,
  Clock,
  CheckCircle2,
  FileText,
  Star,
  MoreVertical,
  Trash2,
  Send,
  Video,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  new: "Baru",
  screening: "Screening",
  interview_hrd: "Interview HRD",
  interview_manager: "Interview Manager",
  talent_pool: "Talent Pool",
  hired: "Diterima",
  rejected: "Ditolak",
  archived: "Diarsipkan",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  screening: "bg-yellow-100 text-yellow-700",
  interview_hrd: "bg-purple-100 text-purple-700",
  interview_manager: "bg-indigo-100 text-indigo-700",
  talent_pool: "bg-pink-100 text-pink-700",
  hired: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-gray-100 text-gray-700",
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

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  domicile: string;
  date_of_birth?: string;
  gender?: string;
  brand_id?: string;
  position_id?: string;
  status: string;
  source: string;
  notes?: string;
  cv_url?: string;
  created_at: string;
  updated_at: string;
  brands?: { name: string };
  positions?: { title: string };
}

interface Activity {
  id: string;
  candidate_id: string;
  activity_type: string;
  description: string;
  created_by?: string;
  created_at: string;
}

interface Note {
  id: string;
  candidate_id: string;
  content: string;
  created_by?: string;
  created_at: string;
}

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    fetchCandidateDetail();
  }, [params.id]);

  const fetchCandidateDetail = async () => {
    setLoading(true);
    try {
      // First, get basic candidate data
      const { data: candidateData, error: candidateError } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", params.id)
        .single();

      if (candidateError) {
        console.error("Error fetching candidate:", candidateError);
        throw candidateError;
      }

      if (!candidateData) {
        setCandidate(null);
        setLoading(false);
        return;
      }

      // Get related brand and position data separately
      let brandData = null;
      let positionData = null;

      if (candidateData.brand_id) {
        const { data: brand } = await supabase
          .from("brands")
          .select("name")
          .eq("id", candidateData.brand_id)
          .single();
        brandData = brand;
      }

      if (candidateData.position_id) {
        const { data: position } = await supabase
          .from("positions")
          .select("title")
          .eq("id", candidateData.position_id)
          .single();
        positionData = position;
      }

      // Combine data
      const candidate = {
        ...candidateData,
        brands: brandData ? { name: brandData.name } : null,
        positions: positionData ? { title: positionData.title } : null,
      };

      setCandidate(candidate as Candidate);

      // Fetch activities (ignore errors if table doesn't exist yet)
      try {
        const { data: activitiesData } = await supabase
          .from("candidate_activities")
          .select("*")
          .eq("candidate_id", params.id)
          .order("created_at", { ascending: false });

        if (activitiesData) setActivities(activitiesData);
      } catch (err) {
        console.log("Activities table not available yet");
        setActivities([]);
      }

      // Fetch notes (ignore errors if table doesn't exist yet)
      try {
        const { data: notesData } = await supabase
          .from("candidate_notes")
          .select("*")
          .eq("candidate_id", params.id)
          .order("created_at", { ascending: false });

        if (notesData) setNotes(notesData);
      } catch (err) {
        console.log("Notes table not available yet");
        setNotes([]);
      }
    } catch (error: any) {
      console.error("Error fetching candidate:", error);
      toast.error("Gagal memuat data kandidat: " + (error.message || "Unknown error"));
      setCandidate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!candidate) return;
    setStatusUpdating(true);
    try {
      const { error } = await supabase
        .from("candidates")
        .update({ status: newStatus })
        .eq("id", candidate.id);

      if (error) throw error;

      // Log activity
      await supabase.from("candidate_activities").insert({
        candidate_id: candidate.id,
        activity_type: "status_change",
        description: `Status diubah dari ${STATUS_LABELS[candidate.status]} ke ${STATUS_LABELS[newStatus]}`,
      });

      setCandidate({ ...candidate, status: newStatus });
      toast.success("Status berhasil diupdate");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Gagal update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddNote = async () => {
    if (!candidate || !newNote.trim()) return;

    try {
      const { data, error } = await supabase
        .from("candidate_notes")
        .insert({
          candidate_id: candidate.id,
          content: newNote,
        })
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNote("");
      setShowNoteDialog(false);
      toast.success("Catatan berhasil ditambahkan");

      // Log activity
      await supabase.from("candidate_activities").insert({
        candidate_id: candidate.id,
        activity_type: "note_added",
        description: "Catatan internal ditambahkan",
      });
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast.error("Gagal menambahkan catatan");
    }
  };

  const handleDownloadCV = () => {
    if (candidate?.cv_url) {
      window.open(candidate.cv_url, "_blank");
      toast.success("Membuka CV...");
    } else {
      toast.error("CV belum diupload");
    }
  };

  const handleSendWhatsApp = () => {
    if (candidate?.phone) {
      const message = `Halo ${candidate.full_name}, terima kasih telah melamar di perusahaan kami. Kami ingin mengundang Anda untuk interview...`;
      const url = `https://wa.me/${candidate.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }
  };

  const handleSendEmail = () => {
    if (candidate?.email) {
      window.location.href = `mailto:${candidate.email}?subject=Undangan Interview&body=Halo ${candidate.full_name},...`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">Memuat data kandidat...</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Kandidat Tidak Ditemukan</h2>
            <p className="text-gray-500 mb-4">Kandidat yang Anda cari tidak ada atau sudah dihapus.</p>
            <Link href="/dashboard/candidates">
              <Button>Kembali ke Daftar Kandidat</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/candidates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
              {candidate.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{candidate.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={STATUS_COLORS[candidate.status]}>
                  {STATUS_LABELS[candidate.status]}
                </Badge>
                <span className="text-gray-500 text-sm">
                  {SOURCE_LABELS[candidate.source] || candidate.source}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadCV}>
                <Download className="w-4 h-4 mr-2" />
                Download CV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendWhatsApp}>
                <Phone className="w-4 h-4 mr-2" />
                Kirim WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSendEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Kirim Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informasi Pribadi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{candidate.email || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Telepon</p>
                    <p className="font-medium">{candidate.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Domisili</p>
                    <p className="font-medium">{candidate.domicile || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Tanggal Lahir</p>
                    <p className="font-medium">{candidate.date_of_birth ? new Date(candidate.date_of_birth).toLocaleDateString("id-ID") : "-"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Informasi Lamaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Posisi</p>
                    <p className="font-medium">{candidate.positions?.title || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Outlet / Brand</p>
                    <p className="font-medium">{candidate.brands?.name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Tanggal Apply</p>
                    <p className="font-medium">{new Date(candidate.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Sumber</p>
                    <p className="font-medium">{SOURCE_LABELS[candidate.source] || candidate.source}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Catatan Internal
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowNoteDialog(true)}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Tambah Catatan
              </Button>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Belum ada catatan internal</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(note.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions & Timeline */}
        <div className="space-y-6">
          {/* Status Update Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Update Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select
                value={candidate.status}
                onValueChange={handleStatusChange}
                disabled={statusUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Baru (New)</SelectItem>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="interview_hrd">Interview HRD</SelectItem>
                  <SelectItem value="interview_manager">Interview Manager</SelectItem>
                  <SelectItem value="talent_pool">Talent Pool</SelectItem>
                  <SelectItem value="hired">Diterima (Hired)</SelectItem>
                  <SelectItem value="rejected">Ditolak (Rejected)</SelectItem>
                  <SelectItem value="archived">Diarsipkan (Archived)</SelectItem>
                </SelectContent>
              </Select>
              {statusUpdating && (
                <p className="text-xs text-gray-500">Mengupdate status...</p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.cv_url ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="font-medium text-sm">CV / Resume</p>
                      <p className="text-xs text-gray-500">PDF Document</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleDownloadCV}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">CV belum diupload</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" onClick={handleSendWhatsApp}>
                <Phone className="w-4 h-4 mr-2" />
                Kirim WhatsApp
              </Button>
              <Button className="w-full" variant="outline" onClick={handleSendEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Kirim Email
              </Button>
              <Button className="w-full" variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Data Kandidat
              </Button>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Aktivitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada aktivitas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(activity.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Catatan Internal</DialogTitle>
            <DialogDescription>
              Tambahkan catatan atau evaluasi tentang kandidat ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Tulis catatan internal..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleAddNote} disabled={!newNote.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Simpan Catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Placeholder */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Kandidat</DialogTitle>
            <DialogDescription>
              Update informasi kandidat {candidate.full_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-gray-500">
            <Edit3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Form edit kandidat akan diimplementasikan selanjutnya</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
