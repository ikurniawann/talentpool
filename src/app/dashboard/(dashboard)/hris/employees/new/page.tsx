"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftIcon,
  UserCircleIcon,
  BriefcaseIcon,
  BanknotesIcon,
  PhoneIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useToast, ToastContainer } from "@/components/ui/toast";

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "probation", label: "Probasi" },
  { value: "contract", label: "Kontrak" },
  { value: "permanent", label: "Tetap" },
  { value: "internship", label: "Magang" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Laki-laki" },
  { value: "female", label: "Perempuan" },
];

const MARITAL_OPTIONS = [
  { value: "single", label: "Lajang" },
  { value: "married", label: "Menikah" },
  { value: "divorced", label: "Cerai" },
  { value: "widowed", label: "Duda/Janda" },
];

interface SuccessData {
  id: string;
  full_name: string;
  nip: string;
}

function SuccessModal({ data, onViewProfile, onAddAnother }: {
  data: SuccessData;
  onViewProfile: () => void;
  onAddAnother: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Karyawan Berhasil Ditambahkan</h2>
          <p className="text-sm text-gray-500">Data karyawan sudah tersimpan di sistem.</p>
        </div>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Nama</span>
            <span className="font-semibold text-gray-900">{data.full_name}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-500">NIP</span>
            <span className="font-mono font-medium text-pink-600">{data.nip}</span>
          </div>
        </div>
        <div className="px-6 py-4 flex flex-col gap-2">
          <Button
            onClick={onViewProfile}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white text-sm"
          >
            Lihat Profil Karyawan
          </Button>
          <Button
            variant="outline"
            onClick={onAddAnother}
            className="w-full text-sm"
          >
            Tambah Karyawan Lain
          </Button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export default function NewEmployeePage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const [saving, setSaving] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    join_date: "",
    employment_status: "",
    phone: "",
    ktp: "",
    npwp: "",
    birth_date: "",
    gender: "",
    marital_status: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    department_id: "",
    section_id: "",
    job_title_id: "",
    reporting_to: "",
    bank_name: "",
    bank_account: "",
    bpjs_tk: "",
    bpjs_kesehatan: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    notes: "",
  });

  useEffect(() => {
    fetchLookups();
  }, []);

  async function fetchLookups() {
    const supabase = createClient();
    const [depts, sects, pos, emps] = await Promise.all([
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("sections").select("id, name").order("name"),
      supabase.from("positions").select("id, title").order("title"),
      supabase.from("employees").select("id, full_name, nip").eq("is_active", true).order("full_name"),
    ]);
    setDepartments(depts.data || []);
    setSections(sects.data || []);
    setPositions(pos.data || []);
    setManagers(emps.data || []);
  }

  function setField(key: string, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.full_name || !form.email || !form.join_date || !form.employment_status) {
      toast("Nama, email, tanggal bergabung, dan status kepegawaian wajib diisi", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) {
        payload[k] = v === "" ? null : v;
      }

      const res = await fetch("/api/hris/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        toast(json.error || "Gagal menyimpan data karyawan", "error");
        return;
      }

      setSuccessData({
        id: json.data?.id,
        full_name: json.data?.full_name || form.full_name,
        nip: json.data?.nip || "-",
      });
    } catch {
      toast("Terjadi kesalahan, coba lagi", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleViewProfile() {
    if (successData?.id) {
      router.push(`/dashboard/hris/employees/${successData.id}`);
    }
  }

  function handleAddAnother() {
    setSuccessData(null);
    setForm({
      full_name: "", email: "", join_date: "", employment_status: "",
      phone: "", ktp: "", npwp: "", birth_date: "", gender: "", marital_status: "",
      address: "", city: "", province: "", postal_code: "",
      department_id: "", section_id: "", job_title_id: "", reporting_to: "",
      bank_name: "", bank_account: "", bpjs_tk: "", bpjs_kesehatan: "",
      emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relationship: "",
      notes: "",
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-10">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {successData && (
        <SuccessModal
          data={successData}
          onViewProfile={handleViewProfile}
          onAddAnother={handleAddAnother}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/hris/employees")}>
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tambah Karyawan</h1>
          <p className="text-xs text-gray-400">Wajib: nama, email, tanggal bergabung, status. Sisanya bisa diisi nanti.</p>
        </div>
      </div>

      {/* Section 1: Personal Info */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <UserCircleIcon className="w-4 h-4 text-pink-500" />
            Informasi Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <FieldLabel required>Nama Lengkap</FieldLabel>
            <Input
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              placeholder="Sesuai KTP"
              className="h-8 text-sm"
            />
          </div>
          <div className="col-span-2">
            <FieldLabel required>Email</FieldLabel>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="email@perusahaan.com"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel>No. Telepon</FieldLabel>
            <Input
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="08xx-xxxx-xxxx"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel>NIK / KTP</FieldLabel>
            <Input
              value={form.ktp}
              onChange={(e) => setField("ktp", e.target.value)}
              placeholder="16 digit"
              maxLength={16}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel>NPWP</FieldLabel>
            <Input
              value={form.npwp}
              onChange={(e) => setField("npwp", e.target.value)}
              placeholder="xx.xxx.xxx.x-xxx.xxx"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel>Tanggal Lahir</FieldLabel>
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => setField("birth_date", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel>Jenis Kelamin</FieldLabel>
            <Select value={form.gender} onValueChange={(v) => setField("gender", v)} items={GENDER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Status Pernikahan</FieldLabel>
            <Select value={form.marital_status} onValueChange={(v) => setField("marital_status", v)} items={MARITAL_OPTIONS.map(o => ({ value: o.value, label: o.label }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {MARITAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <FieldLabel>Alamat</FieldLabel>
            <Input
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Alamat lengkap"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel>Kota</FieldLabel>
            <Input
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              placeholder="Jakarta"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel>Provinsi</FieldLabel>
            <Input
              value={form.province}
              onChange={(e) => setField("province", e.target.value)}
              placeholder="DKI Jakarta"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel>Kode Pos</FieldLabel>
            <Input
              value={form.postal_code}
              onChange={(e) => setField("postal_code", e.target.value)}
              placeholder="12345"
              maxLength={5}
              className="h-8 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Employment */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <BriefcaseIcon className="w-4 h-4 text-pink-500" />
            Data Kepegawaian
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <FieldLabel required>Tanggal Bergabung</FieldLabel>
            <Input
              type="date"
              value={form.join_date}
              onChange={(e) => setField("join_date", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <FieldLabel required>Status Kepegawaian</FieldLabel>
            <Select value={form.employment_status} onValueChange={(v) => setField("employment_status", v)} items={EMPLOYMENT_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih status" /></SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Departemen</FieldLabel>
            <Select value={form.department_id} onValueChange={(v) => setField("department_id", v)} items={departments.map(d => ({ value: d.id, label: d.name }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Seksi / Tim</FieldLabel>
            <Select value={form.section_id} onValueChange={(v) => setField("section_id", v)} items={sections.map(s => ({ value: s.id, label: s.name }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Jabatan</FieldLabel>
            <Select value={form.job_title_id} onValueChange={(v) => setField("job_title_id", v)} items={positions.map(p => ({ value: p.id, label: p.title }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Atasan Langsung</FieldLabel>
            <Select value={form.reporting_to} onValueChange={(v) => setField("reporting_to", v)} items={managers.map(m => ({ value: m.id, label: `${m.full_name} (${m.nip})` }))}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.nip})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 & 4 combined: Bank, BPJS, Emergency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <BanknotesIcon className="w-4 h-4 text-pink-500" />
              Bank & BPJS
              <span className="text-xs font-normal text-gray-400">(opsional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Nama Bank</FieldLabel>
              <Input
                value={form.bank_name}
                onChange={(e) => setField("bank_name", e.target.value)}
                placeholder="BCA / Mandiri"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <FieldLabel>No. Rekening</FieldLabel>
              <Input
                value={form.bank_account}
                onChange={(e) => setField("bank_account", e.target.value)}
                placeholder="Nomor rekening"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <FieldLabel>BPJS Ketenagakerjaan</FieldLabel>
              <Input
                value={form.bpjs_tk}
                onChange={(e) => setField("bpjs_tk", e.target.value)}
                placeholder="No. BPJS TK"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <FieldLabel>BPJS Kesehatan</FieldLabel>
              <Input
                value={form.bpjs_kesehatan}
                onChange={(e) => setField("bpjs_kesehatan", e.target.value)}
                placeholder="No. BPJS Kesehatan"
                className="h-8 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <PhoneIcon className="w-4 h-4 text-pink-500" />
              Kontak Darurat
              <span className="text-xs font-normal text-gray-400">(opsional)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldLabel>Nama</FieldLabel>
              <Input
                value={form.emergency_contact_name}
                onChange={(e) => setField("emergency_contact_name", e.target.value)}
                placeholder="Nama kontak darurat"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <FieldLabel>No. Telepon</FieldLabel>
              <Input
                value={form.emergency_contact_phone}
                onChange={(e) => setField("emergency_contact_phone", e.target.value)}
                placeholder="08xx-xxxx-xxxx"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <FieldLabel>Hubungan</FieldLabel>
              <Input
                value={form.emergency_contact_relationship}
                onChange={(e) => setField("emergency_contact_relationship", e.target.value)}
                placeholder="Orang Tua / Suami"
                className="h-8 text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      <Card>
        <CardContent className="px-5 py-4">
          <FieldLabel>Catatan <span className="text-gray-400 font-normal">(opsional)</span></FieldLabel>
          <textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={2}
            placeholder="Catatan tambahan mengenai karyawan..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/hris/employees")}>
          Batal
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-pink-600 hover:bg-pink-700 text-white"
        >
          {saving ? "Menyimpan..." : "Tambah Karyawan"}
        </Button>
      </div>
    </div>
  );
}
