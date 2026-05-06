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

const CATEGORIES = ["Sales", "Operations", "Customer Service", "Finance", "HR", "Technical", "Marketing"];
const UNITS = ["%", "Rupiah", "Unit", "Score", "Jam", "Jumlah"];
const FREQUENCIES = ["Monthly", "Quarterly", "Semester", "Annually"];

interface Department { id: string; name: string; }
interface Position { id: string; name: string; }

export default function NewKpiTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    default_weight: 100,
    default_target: 0,
    unit: "%",
    measurement_frequency: "Monthly",
    measurement_formula: "",
  });

  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/hris/employees?limit=1")
      .then(r => r.json())
      .catch(() => {});

    fetch("/api/master/departments?limit=100")
      .then(r => r.json())
      .then(j => setDepartments(j.data || []))
      .catch(() => {});

    fetch("/api/master/positions?limit=100")
      .then(r => r.json())
      .then(j => setPositions(j.data || []))
      .catch(() => {});
  }, []);

  function toggleDept(id: string) {
    setSelectedDepts(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  function togglePosition(id: string) {
    setSelectedPositions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category) {
      setError("Nama dan Kategori wajib diisi");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const mappings = [
        ...selectedDepts.map(id => ({ mapping_type: "department", mapping_id: id })),
        ...selectedPositions.map(id => ({ mapping_type: "job_title", mapping_id: id })),
      ];

      const res = await fetch("/api/hris/kpi-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mappings }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal menyimpan template");
        return;
      }

      router.push("/dashboard/hris/performance/kpi-templates");
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
          <h1 className="text-2xl font-bold text-gray-900">Tambah Template KPI</h1>
          <p className="text-sm text-gray-500">Buat template KPI baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Template <span className="text-red-500">*</span></label>
              <Input
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Target Penjualan Bulanan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Deskripsi singkat tentang KPI ini"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori <span className="text-red-500">*</span></label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frekuensi Pengukuran</label>
                <Select value={form.measurement_frequency} onValueChange={(v) => setForm(f => ({ ...f, measurement_frequency: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Pengukuran</label>
                <Select value={form.unit} onValueChange={(v) => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bobot Default (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.default_weight}
                  onChange={(e) => setForm(f => ({ ...f, default_weight: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Default</label>
                <Input
                  type="number"
                  min={0}
                  value={form.default_target}
                  onChange={(e) => setForm(f => ({ ...f, default_target: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Formula Pengukuran</label>
              <textarea
                value={form.measurement_formula}
                onChange={(e) => setForm(f => ({ ...f, measurement_formula: e.target.value }))}
                placeholder="Contoh: Aktual / Target × 100"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]"
              />
            </div>
          </CardContent>
        </Card>

        {(departments.length > 0 || positions.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Pemetaan (Opsional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {departments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departemen</label>
                  <div className="flex flex-wrap gap-2">
                    {departments.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDept(d.id)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          selectedDepts.includes(d.id)
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {positions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jabatan</label>
                  <div className="flex flex-wrap gap-2">
                    {positions.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePosition(p.id)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          selectedPositions.includes(p.id)
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
          <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? "Menyimpan..." : "Simpan Template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
