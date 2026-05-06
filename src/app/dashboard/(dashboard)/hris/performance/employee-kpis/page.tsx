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
import { PlusIcon, EyeIcon } from "@heroicons/react/24/outline";

interface EmployeeKpi {
  id: string;
  name: string;
  category: string;
  weight: number;
  target: number;
  actual_value: number;
  achievement_percentage: number;
  unit: string;
  period_label: string;
  period_start: string;
  period_end: string;
  status: string;
  employee: { id: string; full_name: string; nip: string; department?: { name: string } };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Aktif",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function getAchievementColor(pct: number) {
  if (pct >= 100) return "text-green-600 font-bold";
  if (pct >= 80) return "text-yellow-600 font-medium";
  return "text-red-600 font-medium";
}

export default function EmployeeKpisPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<EmployeeKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [periodLabel, setPeriodLabel] = useState("");
  const [total, setTotal] = useState(0);

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (status !== "all") params.set("status", status);
      if (periodLabel) params.set("period_label", periodLabel);

      const res = await fetch(`/api/hris/employee-kpis?${params}`);
      const json = await res.json();
      let data: EmployeeKpi[] = json.data || [];
      if (search) {
        const s = search.toLowerCase();
        data = data.filter(k =>
          k.name.toLowerCase().includes(s) ||
          k.employee?.full_name?.toLowerCase().includes(s)
        );
      }
      setKpis(data);
      setTotal(json.pagination?.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [status, periodLabel, search]);

  useEffect(() => {
    const t = setTimeout(() => fetchKpis(), 300);
    return () => clearTimeout(t);
  }, [fetchKpis]);

  const activeCount = kpis.filter(k => k.status === "active").length;
  const avgAchievement = kpis.length > 0
    ? Math.round(kpis.reduce((sum, k) => sum + (k.achievement_percentage || 0), 0) / kpis.length)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Karyawan</h1>
          <p className="text-sm text-gray-500">Pantau dan kelola KPI per karyawan</p>
        </div>
        <Button onClick={() => router.push("/dashboard/hris/performance/employee-kpis/new")} className="bg-green-600 hover:bg-green-700">
          <PlusIcon className="w-4 h-4 mr-2" />
          Assign KPI
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">KPI Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Rata-rata Capaian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getAchievementColor(avgAchievement)}`}>{avgAchievement}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Selesai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.filter(k => k.status === "completed").length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Cari karyawan atau KPI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="md:w-64"
            />
            <Input
              placeholder="Periode (contoh: Q1 2026)"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              className="md:w-48"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="md:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : kpis.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="font-medium">Belum ada KPI karyawan</p>
              <p className="text-sm mt-1">Klik "Assign KPI" untuk menambahkan KPI</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Karyawan</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Nama KPI</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Periode</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Target</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Aktual</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Capaian</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.map(k => (
                    <tr key={k.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-900">{k.employee?.full_name}</div>
                        <div className="text-xs text-gray-400">{k.employee?.department?.name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{k.name}</div>
                        <div className="text-xs text-gray-400">{k.category}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{k.period_label}</td>
                      <td className="py-3 px-3 text-right">{k.target} {k.unit}</td>
                      <td className="py-3 px-3 text-right">{k.actual_value ?? "-"} {k.actual_value != null ? k.unit : ""}</td>
                      <td className={`py-3 px-3 text-right ${getAchievementColor(k.achievement_percentage || 0)}`}>
                        {k.achievement_percentage != null ? `${k.achievement_percentage.toFixed(1)}%` : "-"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={STATUS_COLORS[k.status]}>
                          {STATUS_LABELS[k.status]}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/hris/performance/employee-kpis/${k.id}`)}
                          >
                            <EyeIcon className="w-4 h-4" />
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
