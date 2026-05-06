"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, PencilIcon, DocumentDuplicateIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

interface KpiTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  default_weight: number;
  default_target: number;
  unit: string;
  measurement_frequency: string;
  is_predefined: boolean;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = ["Sales", "Operations", "Customer Service", "Finance", "HR", "Technical", "Marketing"];

const CATEGORY_COLORS: Record<string, string> = {
  Sales: "bg-blue-100 text-blue-700",
  Operations: "bg-orange-100 text-orange-700",
  "Customer Service": "bg-purple-100 text-purple-700",
  Finance: "bg-yellow-100 text-yellow-700",
  HR: "bg-pink-100 text-pink-700",
  Technical: "bg-cyan-100 text-cyan-700",
  Marketing: "bg-green-100 text-green-700",
};

export default function KpiTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<KpiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isActive, setIsActive] = useState("all");
  const [total, setTotal] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (category !== "all") params.set("category", category);
      if (isActive !== "all") params.set("is_active", isActive);

      const res = await fetch(`/api/hris/kpi-templates?${params}`);
      const json = await res.json();
      setTemplates(json.data || []);
      setTotal(json.pagination?.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [search, category, isActive]);

  useEffect(() => {
    const timer = setTimeout(() => fetchTemplates(), 300);
    return () => clearTimeout(timer);
  }, [fetchTemplates]);

  async function handleToggleActive(id: string, current: boolean) {
    await fetch(`/api/hris/kpi-templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    fetchTemplates();
  }

  async function handleDuplicate(template: KpiTemplate) {
    const { id, is_predefined, created_at, ...rest } = template;
    await fetch("/api/hris/kpi-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rest, name: `${rest.name} (Salinan)` }),
    });
    fetchTemplates();
  }

  const activeCount = templates.filter(t => t.is_active).length;
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template KPI</h1>
          <p className="text-sm text-gray-500">Kelola template KPI yang dapat digunakan untuk penilaian karyawan</p>
        </div>
        <Button onClick={() => router.push("/dashboard/hris/performance/kpi-templates/new")} className="bg-green-600 hover:bg-green-700">
          <PlusIcon className="w-4 h-4 mr-2" />
          Tambah Template
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Predefined</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{templates.filter(t => t.is_predefined).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{CATEGORIES.filter(c => categoryCounts[c] > 0).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Cari template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:w-64"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="md:w-48">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={isActive} onValueChange={setIsActive}>
              <SelectTrigger className="md:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="font-medium">Belum ada template KPI</p>
              <p className="text-sm mt-1">Klik "Tambah Template" untuk membuat template baru</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Nama</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Kategori</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Unit</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Frekuensi</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Bobot</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Target</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-900">{t.name}</div>
                        {t.is_predefined && (
                          <span className="text-xs text-gray-400">Predefined</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={CATEGORY_COLORS[t.category] || "bg-gray-100 text-gray-700"}>
                          {t.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{t.unit}</td>
                      <td className="py-3 px-3 text-gray-600">{t.measurement_frequency}</td>
                      <td className="py-3 px-3 text-right font-medium">{t.default_weight}%</td>
                      <td className="py-3 px-3 text-right text-gray-600">{t.default_target}</td>
                      <td className="py-3 px-3">
                        <Badge className={t.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                          {t.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/hris/performance/kpi-templates/${t.id}/edit`)}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicate(t)}
                            title="Duplikat"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(t.id, t.is_active)}
                            className={t.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                            title={t.is_active ? "Nonaktifkan" : "Aktifkan"}
                          >
                            {t.is_active ? <XCircleIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
