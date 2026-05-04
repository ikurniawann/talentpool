"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeftIcon,
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { useToast, ToastContainer } from "@/components/ui/toast";

const STATUS_LABELS: Record<string, string> = {
  probation: "Probasi",
  contract: "Kontrak",
  permanent: "Tetap",
  internship: "Magang",
  resigned: "Resign",
  terminated: "PHK",
  suspended: "Suspend",
};

const STATUS_COLORS: Record<string, string> = {
  probation: "bg-yellow-100 text-yellow-700",
  contract: "bg-blue-100 text-blue-700",
  permanent: "bg-green-100 text-green-700",
  internship: "bg-purple-100 text-purple-700",
  resigned: "bg-red-100 text-red-600",
  terminated: "bg-red-200 text-red-700",
  suspended: "bg-orange-100 text-orange-700",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  ktp: "KTP",
  npwp: "NPWP",
  ijazah: "Ijazah",
  cv: "CV / Resume",
  kontrak: "Kontrak Kerja",
  bpjs_tk: "BPJS Ketenagakerjaan",
  bpjs_kes: "BPJS Kesehatan",
  sertifikat: "Sertifikat",
  other: "Lainnya",
};

const HISTORY_TYPE_LABELS: Record<string, string> = {
  hire: "Bergabung",
  promotion: "Promosi",
  transfer: "Mutasi",
  demotion: "Demosi",
  status_change: "Perubahan Status",
  salary_change: "Perubahan Gaji",
};

const HISTORY_COLORS: Record<string, string> = {
  hire: "bg-green-100 text-green-700",
  promotion: "bg-blue-100 text-blue-700",
  transfer: "bg-purple-100 text-purple-700",
  demotion: "bg-orange-100 text-orange-700",
  status_change: "bg-yellow-100 text-yellow-700",
  salary_change: "bg-teal-100 text-teal-700",
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function calculateTenure(joinDate: string) {
  const join = new Date(joinDate);
  const now = new Date();
  const years = now.getFullYear() - join.getFullYear();
  const months = now.getMonth() - join.getMonth();
  if (years > 0) return `${years} tahun ${Math.max(0, months)} bulan`;
  if (months > 0) return `${months} bulan`;
  return "Baru bergabung";
}

type Tab = "info" | "employment" | "documents" | "attendance" | "leave";

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const { toasts, toast, dismiss } = useToast();

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");

  // Tab data
  const [documents, setDocuments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Document upload dialog
  const [docDialog, setDocDialog] = useState(false);
  const [docForm, setDocForm] = useState({
    document_type: "ktp",
    document_name: "",
    file_url: "",
    issue_date: "",
    expiry_date: "",
    notes: "",
  });
  const [savingDoc, setSavingDoc] = useState(false);

  const fetchEmployee = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/hris/employees/${id}`);
    const json = await res.json();
    if (json.data) setEmployee(json.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const fetchTabData = useCallback(async (tab: Tab) => {
    setTabLoading(true);
    try {
      if (tab === "documents") {
        const res = await fetch(`/api/hris/employees/documents?employee_id=${id}`);
        const json = await res.json();
        setDocuments(json.data || []);
      } else if (tab === "employment") {
        const res = await fetch(`/api/hris/employment-history?employee_id=${id}`);
        const json = await res.json();
        setHistory(json.data || []);
      } else if (tab === "attendance") {
        const now = new Date();
        const params = new URLSearchParams({
          employee_id: id,
          month: String(now.getMonth() + 1),
          year: String(now.getFullYear()),
        });
        const res = await fetch(`/api/hris/attendance?${params}`);
        const json = await res.json();
        setAttendance(json.data || []);
      } else if (tab === "leave") {
        const res = await fetch(`/api/hris/leave-balances/${id}`);
        const json = await res.json();
        setLeaveBalances(json.data || []);
      }
    } finally {
      setTabLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab !== "info") {
      fetchTabData(activeTab);
    }
  }, [activeTab, fetchTabData]);

  async function handleSaveDocument() {
    if (!docForm.document_name || !docForm.file_url) {
      toast("Nama dokumen dan URL file wajib diisi", "error");
      return;
    }
    setSavingDoc(true);
    const res = await fetch("/api/hris/employees/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: id, ...docForm }),
    });
    if (res.ok) {
      toast("Dokumen berhasil disimpan");
      setDocDialog(false);
      setDocForm({ document_type: "ktp", document_name: "", file_url: "", issue_date: "", expiry_date: "", notes: "" });
      fetchTabData("documents");
    } else {
      const err = await res.json();
      toast(err.error || "Gagal menyimpan dokumen", "error");
    }
    setSavingDoc(false);
  }

  async function handleDeleteDocument(docId: string) {
    if (!confirm("Hapus dokumen ini?")) return;
    const res = await fetch(`/api/hris/employees/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Dokumen dihapus");
      fetchTabData("documents");
    } else {
      toast("Gagal menghapus dokumen", "error");
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "info", label: "Info Personal", icon: <UserCircleIcon className="w-4 h-4" /> },
    { key: "employment", label: "Riwayat Kerja", icon: <BriefcaseIcon className="w-4 h-4" /> },
    { key: "documents", label: "Dokumen", icon: <DocumentTextIcon className="w-4 h-4" /> },
    { key: "attendance", label: "Absensi", icon: <ClockIcon className="w-4 h-4" /> },
    { key: "leave", label: "Saldo Cuti", icon: <CalendarDaysIcon className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Karyawan tidak ditemukan</p>
        <Button className="mt-4" onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => router.push("/dashboard/hris/employees")} className="hover:text-gray-900">
          Direktori Karyawan
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium">{employee?.full_name || "Detail Karyawan"}</span>
      </div>

      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeftIcon className="w-4 h-4" /> Kembali
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt={employee.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {employee.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{employee.full_name}</h1>
                <Badge className={STATUS_COLORS[employee.employment_status] || "bg-gray-100 text-gray-600"}>
                  {STATUS_LABELS[employee.employment_status] || employee.employment_status}
                </Badge>
                {employee.is_active ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Aktif
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <XCircleIcon className="w-3.5 h-3.5" /> Nonaktif
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {employee.job_title?.title || "—"} · {employee.department?.name || "—"}
                {employee.section ? ` · ${employee.section.name}` : ""}
              </p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{employee.nip}</span>
                {employee.email && (
                  <span className="flex items-center gap-1">
                    <EnvelopeIcon className="w-3.5 h-3.5" /> {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="w-3.5 h-3.5" /> {employee.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarDaysIcon className="w-3.5 h-3.5" />
                  Bergabung {formatDate(employee.join_date)} · {calculateTenure(employee.join_date)}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/hris/onboarding/${id}`)}
                className="gap-1"
              >
                Onboarding
              </Button>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/hris/employees/${id}/edit`)}
                className="gap-1"
              >
                <PencilIcon className="w-4 h-4" /> Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tabLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full" />
        </div>
      ) : (
        <>
          {/* INFO PERSONAL */}
          {activeTab === "info" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <UserCircleIcon className="w-4 h-4" /> Data Pribadi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Nama Lengkap", value: employee.full_name },
                    { label: "Jenis Kelamin", value: employee.gender === "male" ? "Laki-laki" : employee.gender === "female" ? "Perempuan" : "-" },
                    { label: "Tanggal Lahir", value: formatDate(employee.birth_date) },
                    { label: "Status Nikah", value: { single: "Belum Menikah", married: "Menikah", divorced: "Cerai", widowed: "Duda/Janda" }[employee.marital_status as string] || "-" },
                    { label: "KTP", value: employee.ktp || "-" },
                    { label: "NPWP", value: employee.npwp || "-" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500 shrink-0 w-36">{label}</span>
                      <span className="text-gray-900 text-right">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Contact & Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4" /> Kontak & Alamat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Email", value: employee.email },
                    { label: "Telepon", value: employee.phone || "-" },
                    { label: "Alamat", value: employee.address || "-" },
                    { label: "Kota", value: employee.city || "-" },
                    { label: "Provinsi", value: employee.province || "-" },
                    { label: "Kode Pos", value: employee.postal_code || "-" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500 shrink-0 w-36">{label}</span>
                      <span className="text-gray-900 text-right">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Employment Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-4 h-4" /> Info Kepegawaian
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "NIP", value: employee.nip },
                    { label: "Departemen", value: employee.department?.name || "-" },
                    { label: "Seksi", value: employee.section?.name || "-" },
                    { label: "Jabatan", value: employee.job_title?.title || "-" },
                    { label: "Atasan", value: employee.manager?.full_name || "-" },
                    { label: "Tanggal Bergabung", value: formatDate(employee.join_date) },
                    { label: "Status", value: STATUS_LABELS[employee.employment_status] || employee.employment_status },
                    { label: "Masa Kerja", value: calculateTenure(employee.join_date) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500 shrink-0 w-36">{label}</span>
                      <span className="text-gray-900 text-right">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Banking & BPJS */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <BanknotesIcon className="w-4 h-4" /> Bank & BPJS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Nama Bank", value: employee.bank_name || "-" },
                    { label: "No. Rekening", value: employee.bank_account || "-" },
                    { label: "BPJS TK", value: employee.bpjs_tk || "-" },
                    { label: "BPJS Kesehatan", value: employee.bpjs_kesehatan || "-" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-500 shrink-0 w-36">{label}</span>
                      <span className="text-gray-900 text-right font-mono text-xs">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4" /> Kontak Darurat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Nama", value: employee.emergency_contact_name || "-" },
                      { label: "Telepon", value: employee.emergency_contact_phone || "-" },
                      { label: "Hubungan", value: employee.emergency_contact_relationship || "-" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-gray-500 shrink-0 w-36">{label}</span>
                        <span className="text-gray-900 text-right">{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* RIWAYAT KERJA */}
          {activeTab === "employment" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Riwayat Kepegawaian</h3>
              </div>
              {history.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    <BriefcaseIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Belum ada riwayat kerja
                  </CardContent>
                </Card>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-4">
                    {history.map((h) => (
                      <div key={h.id} className="relative pl-12">
                        <div className="absolute left-3.5 top-3 w-3 h-3 rounded-full border-2 border-white bg-blue-500 shadow" />
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={HISTORY_COLORS[h.change_type] || "bg-gray-100 text-gray-600"}>
                                {HISTORY_TYPE_LABELS[h.change_type] || h.change_type}
                              </Badge>
                              <span className="text-xs text-gray-500">{formatDate(h.effective_date)}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              {h.prev_department && (
                                <div>
                                  <p className="text-xs text-gray-400">Dari Departemen</p>
                                  <p className="text-gray-700">{h.prev_department.name}</p>
                                </div>
                              )}
                              {h.new_department && (
                                <div>
                                  <p className="text-xs text-gray-400">Ke Departemen</p>
                                  <p className="text-gray-700 font-medium">{h.new_department.name}</p>
                                </div>
                              )}
                              {h.prev_job_title && (
                                <div>
                                  <p className="text-xs text-gray-400">Dari Jabatan</p>
                                  <p className="text-gray-700">{h.prev_job_title.title}</p>
                                </div>
                              )}
                              {h.new_job_title && (
                                <div>
                                  <p className="text-xs text-gray-400">Ke Jabatan</p>
                                  <p className="text-gray-700 font-medium">{h.new_job_title.title}</p>
                                </div>
                              )}
                              {h.prev_employment_status && (
                                <div>
                                  <p className="text-xs text-gray-400">Dari Status</p>
                                  <p className="text-gray-700">{STATUS_LABELS[h.prev_employment_status]}</p>
                                </div>
                              )}
                              {h.new_employment_status && (
                                <div>
                                  <p className="text-xs text-gray-400">Ke Status</p>
                                  <p className="text-gray-700 font-medium">{STATUS_LABELS[h.new_employment_status]}</p>
                                </div>
                              )}
                            </div>
                            {h.reason && (
                              <p className="mt-2 text-xs text-gray-500 italic">"{h.reason}"</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DOKUMEN */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Dokumen Karyawan</h3>
                <Button size="sm" onClick={() => setDocDialog(true)} className="gap-1">
                  <ArrowUpTrayIcon className="w-4 h-4" /> Upload Dokumen
                </Button>
              </div>
              {documents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Belum ada dokumen. Klik "Upload Dokumen" untuk menambahkan.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                              {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                            </p>
                            <p className="font-medium text-gray-900 text-sm mt-0.5 truncate">
                              {doc.document_name}
                            </p>
                            {doc.issue_date && (
                              <p className="text-xs text-gray-400 mt-1">
                                Terbit: {formatDate(doc.issue_date)}
                              </p>
                            )}
                            {doc.expiry_date && (
                              <p className={`text-xs mt-0.5 ${new Date(doc.expiry_date) < new Date() ? "text-red-500" : "text-gray-400"}`}>
                                Berlaku: {formatDate(doc.expiry_date)}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(doc.file_url, "_blank")}
                              className="text-blue-600 hover:bg-blue-50 p-1.5"
                              title="Lihat dokumen"
                            >
                              <IdentificationIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-500 hover:bg-red-50 p-1.5"
                              title="Hapus"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {doc.is_verified && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Terverifikasi
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABSENSI */}
          {activeTab === "attendance" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Ringkasan Absensi (Bulan Ini)</h3>
              {attendance.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Belum ada data absensi bulan ini
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Hadir", value: attendance.filter(a => a.status === "present").length, color: "text-green-700" },
                      { label: "Terlambat", value: attendance.filter(a => a.is_late).length, color: "text-yellow-700" },
                      { label: "Tidak Hadir", value: attendance.filter(a => a.status === "absent").length, color: "text-red-700" },
                      { label: "Total Jam", value: attendance.reduce((sum: number, a: any) => sum + (a.work_hours || 0), 0).toFixed(1) + "j", color: "text-blue-700" },
                    ].map((s) => (
                      <Card key={s.label}>
                        <CardContent className="pt-4 pb-3">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-500">{s.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {/* Attendance List */}
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                              <th className="text-left p-3">Tanggal</th>
                              <th className="text-left p-3">Clock In</th>
                              <th className="text-left p-3">Clock Out</th>
                              <th className="text-left p-3">Jam Kerja</th>
                              <th className="text-left p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendance.map((a) => (
                              <tr key={a.id} className="border-b border-gray-50">
                                <td className="p-3 text-gray-700">{formatDate(a.date)}</td>
                                <td className="p-3 text-gray-600">{a.clock_in ? new Date(a.clock_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                                <td className="p-3 text-gray-600">{a.clock_out ? new Date(a.clock_out).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                                <td className="p-3 text-gray-600">{a.work_hours ? `${a.work_hours.toFixed(1)}j` : "-"}</td>
                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <Badge className={a.status === "present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}>
                                      {a.status === "present" ? "Hadir" : a.status === "absent" ? "Absen" : a.status}
                                    </Badge>
                                    {a.is_late && <Badge className="bg-yellow-100 text-yellow-700">Terlambat</Badge>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* SALDO CUTI */}
          {activeTab === "leave" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700">Saldo Cuti</h3>
              {leaveBalances.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-400">
                    <CalendarDaysIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Belum ada data saldo cuti
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaveBalances.map((lb) => (
                    <Card key={lb.id}>
                      <CardContent className="p-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          {lb.leave_type_name || lb.leave_type}
                        </p>
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-bold text-blue-600">{lb.remaining_days ?? lb.balance}</span>
                          <span className="text-sm text-gray-400 mb-0.5">/ {lb.total_days ?? lb.quota} hari</span>
                        </div>
                        {(lb.used_days !== undefined || lb.used !== undefined) && (
                          <p className="text-xs text-gray-400 mt-1">
                            Terpakai: {lb.used_days ?? lb.used} hari
                          </p>
                        )}
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${Math.min(100, ((lb.used_days ?? lb.used ?? 0) / (lb.total_days ?? lb.quota ?? 1)) * 100)}%`
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Document Upload Dialog */}
      <Dialog open={docDialog} onOpenChange={(o) => !o && setDocDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Dokumen</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Tipe Dokumen *</label>
              <Select
                value={docForm.document_type}
                onValueChange={(v) => setDocForm((f) => ({ ...f, document_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Nama Dokumen *</label>
              <Input
                value={docForm.document_name}
                onChange={(e) => setDocForm((f) => ({ ...f, document_name: e.target.value }))}
                placeholder="e.g. KTP Atas Nama Budi"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">URL File *</label>
              <Input
                value={docForm.file_url}
                onChange={(e) => setDocForm((f) => ({ ...f, file_url: e.target.value }))}
                placeholder="https://... atau path ke file"
              />
              <p className="text-xs text-gray-400 mt-1">
                Upload file ke Supabase Storage, lalu paste URL-nya di sini
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Tanggal Terbit</label>
                <Input
                  type="date"
                  value={docForm.issue_date}
                  onChange={(e) => setDocForm((f) => ({ ...f, issue_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Berlaku Sampai</label>
                <Input
                  type="date"
                  value={docForm.expiry_date}
                  onChange={(e) => setDocForm((f) => ({ ...f, expiry_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Catatan</label>
              <Input
                value={docForm.notes}
                onChange={(e) => setDocForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog(false)}>Batal</Button>
            <Button onClick={handleSaveDocument} disabled={savingDoc}>
              {savingDoc ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
