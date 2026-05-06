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

const UNITS = ["%", "Rupiah", "Unit", "Score", "Jam", "Jumlah"];
const FREQUENCIES = ["Monthly", "Quarterly", "Semester", "Annually"];
const CATEGORIES = ["Sales", "Operations", "Customer Service", "Finance", "HR", "Technical", "Marketing"];

interface Employee { id: string; full_name: string; nip: string; department?: { name: string }; }
interface KpiTemplate { id: string; name: string; category: string; default_weight: number; default_target: number; unit: string; measurement_frequency: string; description: string; }

export default function NewEmployeeKpiPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<KpiTemplate[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [form, setForm] = useState({
    employee_id: "",
    template_id: "",
    name: "",
    description: "",
    category: "",
    weight: 100,
    target: 0,
    unit: "%",
    measurement_frequency: "Monthly",
    period_label: "",
    period_start: "",
    period_end: "",
    notes: "",
    status: "active",
  });

  useEffect(() => {
    fetch("/api/hris/employees?limit=200&status=active")
      .then(r => r.json())
      .then(j => setEmployees(j.data || []))
      .catch(() => {});

    fetch("/api/hris/kpi-templates?is_active=true&limit=100")
      .then(r => r.json())
      .then(j => setTemplates(j.data || []))
      .catch(() => {});
  }, []);

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setForm(f => ({
        ...f,
        template_id: templateId,
        name: tpl.name,
        description: tpl.description || "",
        category: tpl.category,
        weight: tpl.default_weight,
        target: tpl.default_target,
        unit: tpl.unit,
        measurement_frequency: tpl.measurement_frequency,
      }));
    }
  }

  const filteredEmployees = employees.filter(e =>
    e.full_name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    e.nip?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.name || !form.period_start || !form.period_end) {
      setError("Karyawan, Nama KPI, dan Periode wajib diisi");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        template_id: mode === "template" && form.template_id ? form.template_id : null,
      };

      const res = await fetch("/api/hris/employee-kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal menyimpan KPI");
        return;
      }

      router.push("/dashboard/hris/performance/employee-kpis");
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
          <h1 className="text-2xl font-bold text-gray-900">Assign KPI Karyawan</h1>
          <p className="text-sm text-gray-500">Tambahkan KPI untuk karyawan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pilih Karyawan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Cari karyawan..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Periode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label Periode <span className="text-red-500">*</span></label>
              <Input
                placeholder="Contoh: Q1 2026, 2026, Semester 1 2026"
                value={form.period_label}
                onChange={(e) => setForm(f => ({ ...f, period_label: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai <span className="text-red-500">*</span></label>
                <Input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setForm(f => ({ ...f, period_start: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai <span className="text-red-500">*</span></label>
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
            <CardTitle>Detail KPI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMode("template")}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  mode === "template" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                }`}
              >
                Dari Template
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  mode === "custom" ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                }`}
              >
                Kustom
              </button>
            </div>

            {mode === "template" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Template</label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih template KPI" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        [{t.category}] {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama KPI <span className="text-red-500">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nama KPI"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frekuensi</label>
                <Select value={form.measurement_frequency} onValueChange={(v) => setForm(f => ({ ...f, measurement_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(fr => <SelectItem key={fr} value={fr}>{fr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <Select value={form.unit} onValueChange={(v) => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bobot (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight}
                  onChange={(e) => setForm(f => ({ ...f, weight: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                <Input
                  type="number"
                  min={0}
                  value={form.target}
                  onChange={(e) => setForm(f => ({ ...f, target: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Awal</label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]"
                placeholder="Catatan tambahan..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
          <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? "Menyimpan..." : "Assign KPI"}
          </Button>
        </div>
      </form>
    </div>
  );
}
