"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface Employee { id: string; full_name: string; nip: string; department?: { name: string }; }

export default function NewReviewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [form, setForm] = useState({
    employee_id: "",
    reviewer_id: "",
    period_label: "",
    period_start: "",
    period_end: "",
    kpi_score: "",
    behavior_score: "",
    overall_score: "",
    strengths: "",
    improvements: "",
    comments: "",
    status: "draft",
  });

  useEffect(() => {
    fetch("/api/hris/employees?limit=200&status=active")
      .then(r => r.json())
      .then(j => setEmployees(j.data || []))
      .catch(() => {});
  }, []);

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.nip?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  function calcOverall() {
    const kpi = parseFloat(form.kpi_score) || 0;
    const beh = parseFloat(form.behavior_score) || 0;
    if (kpi > 0 && beh > 0) {
      const overall = ((kpi * 0.6) + (beh * 0.4)).toFixed(2);
      setForm(f => ({ ...f, overall_score: overall }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.period_label) {
      setError("Karyawan dan Label Periode wajib diisi");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        kpi_score: form.kpi_score ? parseFloat(form.kpi_score) : null,
        behavior_score: form.behavior_score ? parseFloat(form.behavior_score) : null,
        overall_score: form.overall_score ? parseFloat(form.overall_score) : null,
        reviewer_id: form.reviewer_id || null,
      };

      const res = await fetch("/api/hris/performance-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal menyimpan review");
        return;
      }

      router.push("/dashboard/hris/performance/reviews");
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Performance Review</h1>
          <p className="text-sm text-gray-500">Penilaian kinerja karyawan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan Yang Dinilai <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Cari karyawan..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="mb-2"
                />
                <Select value={form.employee_id} onValueChange={(v) => setForm(f => ({ ...f, employee_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name} — {e.department?.name || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer (Atasan)</label>
                <Select value={form.reviewer_id} onValueChange={(v) => setForm(f => ({ ...f, reviewer_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label Periode <span className="text-red-500">*</span></label>
              <Input
                placeholder="Contoh: Q1 2026, 2026"
                value={form.period_label}
                onChange={(e) => setForm(f => ({ ...f, period_label: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                <Input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm(f => ({ ...f, period_start: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setForm(f => ({ ...f, period_end: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Penilaian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skor KPI (0-100)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.kpi_score}
                  onChange={(e) => setForm(f => ({ ...f, kpi_score: e.target.value }))}
                  onBlur={calcOverall}
                  placeholder="0-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skor Perilaku (0-100)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.behavior_score}
                  onChange={(e) => setForm(f => ({ ...f, behavior_score: e.target.value }))}
                  onBlur={calcOverall}
                  placeholder="0-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skor Keseluruhan</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.overall_score}
                  onChange={(e) => setForm(f => ({ ...f, overall_score: e.target.value }))}
                  placeholder="Auto (KPI×60% + Perilaku×40%)"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
              Skor keseluruhan dihitung otomatis: KPI (60%) + Perilaku (40%). Bisa diubah manual.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kekuatan</label>
              <textarea
                value={form.strengths}
                onChange={(e) => setForm(f => ({ ...f, strengths: e.target.value }))}
                placeholder="Kekuatan dan hal-hal positif karyawan..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area Pengembangan</label>
              <textarea
                value={form.improvements}
                onChange={(e) => setForm(f => ({ ...f, improvements: e.target.value }))}
                placeholder="Area yang perlu ditingkatkan..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Komentar</label>
              <textarea
                value={form.comments}
                onChange={(e) => setForm(f => ({ ...f, comments: e.target.value }))}
                placeholder="Komentar tambahan dari reviewer..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submit</SelectItem>
                  <SelectItem value="approved">Setujui</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
          <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? "Menyimpan..." : "Simpan Review"}
          </Button>
        </div>
      </form>
    </div>
  );
}
