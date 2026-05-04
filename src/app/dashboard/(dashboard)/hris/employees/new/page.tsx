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

export default function NewEmployeePage() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  const [form, setForm] = useState({
    // Personal — required
    full_name: "",
    email: "",
    join_date: "",
    employment_status: "",
    // Personal — optional
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
    // Employment — optional
    department_id: "",
    section_id: "",
    job_title_id: "",
    reporting_to: "",
    // Bank & BPJS — optional
    bank_name: "",
    bank_account: "",
    bpjs_tk: "",
    bpjs_kesehatan: "",
    // Emergency — optional
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
        // Skip nip - let API generate
        if (k === 'nip') continue;
        payload[k] = v === "" ? null : v;
      }

      console.log('Submitting payload:', JSON.stringify(payload, null, 2));

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

      toast("Karyawan berhasil ditambahkan", "success");
      const newId = json.data?.id;
      setTimeout(() => {
        router.push(newId ? `/dashboard/hris/employees/${newId}` : "/dashboard/hris/employees");
      }, 1200);
    } catch {
      toast("Terjadi kesalahan, coba lagi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/hris/employees")}>
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Karyawan</h1>
          <p className="text-sm text-gray-500">Isi data minimal: nama, email, tanggal bergabung, dan status. Sisanya bisa diisi nanti.</p>
        </div>
      </div>

      {/* Section 1: Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircleIcon className="w-5 h-5 text-pink-500" />
            Informasi Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              placeholder="Nama lengkap sesuai KTP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="email@perusahaan.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
            <Input
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="08xx-xxxx-xxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIK / KTP</label>
            <Input
              value={form.ktp}
              onChange={(e) => setField("ktp", e.target.value)}
              placeholder="16 digit NIK"
              maxLength={16}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NPWP</label>
            <Input
              value={form.npwp}
              onChange={(e) => setField("npwp", e.target.value)}
              placeholder="xx.xxx.xxx.x-xxx.xxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => setField("birth_date", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
            <Select value={form.gender} onValueChange={(v) => setField("gender", v)} items={GENDER_OPTIONS.map(o => ({ value: o.value, label: o.label }))}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Pernikahan</label>
            <Select value={form.marital_status} onValueChange={(v) => setField("marital_status", v)} items={MARITAL_OPTIONS.map(o => ({ value: o.value, label: o.label }))}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {MARITAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <Input
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Alamat lengkap"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
            <Input
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              placeholder="Jakarta"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
            <Input
              value={form.province}
              onChange={(e) => setField("province", e.target.value)}
              placeholder="DKI Jakarta"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Pos</label>
            <Input
              value={form.postal_code}
              onChange={(e) => setField("postal_code", e.target.value)}
              placeholder="12345"
              maxLength={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Employment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BriefcaseIcon className="w-5 h-5 text-pink-500" />
            Data Kepegawaian
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Bergabung <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={form.join_date}
              onChange={(e) => setField("join_date", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Kepegawaian <span className="text-red-500">*</span>
            </label>
            <Select value={form.employment_status} onValueChange={(v) => setField("employment_status", v)} items={EMPLOYMENT_STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))}>
              <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departemen</label>
            <Select value={form.department_id} onValueChange={(v) => setField("department_id", v)} items={departments.map(d => ({ value: d.id, label: d.name }))}>
              <SelectTrigger><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seksi / Tim</label>
            <Select value={form.section_id} onValueChange={(v) => setField("section_id", v)} items={sections.map(s => ({ value: s.id, label: s.name }))}>
              <SelectTrigger><SelectValue placeholder="Pilih seksi" /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
            <Select value={form.job_title_id} onValueChange={(v) => setField("job_title_id", v)} items={positions.map(p => ({ value: p.id, label: p.title }))}>
              <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Atasan Langsung</label>
            <Select value={form.reporting_to} onValueChange={(v) => setField("reporting_to", v)} items={managers.map(m => ({ value: m.id, label: `${m.full_name} (${m.nip})` }))}>
              <SelectTrigger><SelectValue placeholder="Pilih atasan" /></SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.nip})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Bank & BPJS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BanknotesIcon className="w-5 h-5 text-pink-500" />
            Bank & BPJS <span className="text-xs font-normal text-gray-400 ml-1">(opsional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
            <Input
              value={form.bank_name}
              onChange={(e) => setField("bank_name", e.target.value)}
              placeholder="BCA / Mandiri / BRI ..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Rekening</label>
            <Input
              value={form.bank_account}
              onChange={(e) => setField("bank_account", e.target.value)}
              placeholder="Nomor rekening"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. BPJS Ketenagakerjaan</label>
            <Input
              value={form.bpjs_tk}
              onChange={(e) => setField("bpjs_tk", e.target.value)}
              placeholder="No. BPJS TK"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. BPJS Kesehatan</label>
            <Input
              value={form.bpjs_kesehatan}
              onChange={(e) => setField("bpjs_kesehatan", e.target.value)}
              placeholder="No. BPJS Kesehatan"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PhoneIcon className="w-5 h-5 text-pink-500" />
            Kontak Darurat <span className="text-xs font-normal text-gray-400 ml-1">(opsional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <Input
              value={form.emergency_contact_name}
              onChange={(e) => setField("emergency_contact_name", e.target.value)}
              placeholder="Nama kontak darurat"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
            <Input
              value={form.emergency_contact_phone}
              onChange={(e) => setField("emergency_contact_phone", e.target.value)}
              placeholder="08xx-xxxx-xxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hubungan</label>
            <Input
              value={form.emergency_contact_relationship}
              onChange={(e) => setField("emergency_contact_relationship", e.target.value)}
              placeholder="Orang Tua / Suami / Istri ..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Catatan <span className="text-xs font-normal text-gray-400">(opsional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={3}
            placeholder="Catatan tambahan mengenai karyawan..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => router.push("/dashboard/hris/employees")}>
          Batal
        </Button>
        <Button
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
