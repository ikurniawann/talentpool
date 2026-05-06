"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function EditKpiTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

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

  useEffect(() => {
    async function load() {
      try {
        const [tplRes, deptsRes, posRes] = await Promise.all([
          fetch(`/api/hris/kpi-templates/${id}`),
          fetch("/api/master/departments?limit=100"),
          fetch("/api/master/positions?limit=100"),
        ]);

        const tplJson = await tplRes.json();
        if (tplJson.data) {
          const t = tplJson.data;
          setForm({
            name: t.name || "",
            description: t.description || "",
            category: t.category || "",
            default_weight: t.default_weight || 100,
            default_target: t.default_target || 0,
            unit: t.unit || "%",
            measurement_frequency: t.measurement_frequency || "Monthly",
            measurement_formula: t.measurement_formula || "",
          });

          const mappings: any[] = t.mappings || [];
          setSelectedDepts(mappings.filter((m: any) => m.mapping_type === "department").map((m: any) => m.mapping_id));
          setSelectedPositions(mappings.filter((m: any) => m.mapping_type === "job_title").map((m: any) => m.mapping_id));
        }

        const deptsJson = await deptsRes.json();
        setDepartments(deptsJson.data || []);

        const posJson = await posRes.json();
        setPositions(posJson.data || []);
      } catch {
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function toggleDept(did: string) {
    setSelectedDepts(prev => prev.includes(did) ? prev.filter(d => d !== did) : [...prev, did]);
  }

  function togglePosition(pid: string) {
    setSelectedPositions(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]);
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
        ...selectedDepts.map(mid => ({ mapping_type: "department", mapping_id: mid })),
        ...selectedPositions.map(mid => ({ mapping_type: "job_title", mapping_id: mid })),
      ];

      const res = await fetch(`/api/hris/kpi-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mappings }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal menyimpan");
        return;
      }

      router.push("/dashboard/hris/performance/kpi-templates");
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Template KPI</h1>
          <p className="text-sm text-gray-500">Ubah informasi template KPI</p>
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori <span className="text-red-500">*</span></label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frekuensi Pengukuran</label>
                <Select value={form.measurement_frequency} onValueChange={(v) => setForm(f => ({ ...f, measurement_frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(fr => <SelectItem key={fr} value={fr}>{fr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Pengukuran</label>
                <Select value={form.unit} onValueChange={(v) => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
