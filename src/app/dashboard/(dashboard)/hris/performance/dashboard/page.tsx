"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChartBarIcon, UserGroupIcon, CheckBadgeIcon, TrophyIcon } from "@heroicons/react/24/outline";

interface EmployeeKpi {
  id: string;
  name: string;
  category: string;
  target: number;
  actual_value: number;
  achievement_percentage: number;
  unit: string;
  period_label: string;
  status: string;
  employee: { id: string; full_name: string; nip: string; department?: { name: string } };
}

interface PerformanceReview {
  id: string;
  period_label: string;
  overall_score: number;
  status: string;
  employee: { id: string; full_name: string; department?: { name: string } };
}

function getAchievementColor(pct: number) {
  if (pct >= 100) return "text-green-600";
  if (pct >= 80) return "text-yellow-600";
  return "text-red-600";
}

function getAchievementBadge(pct: number) {
  if (pct >= 100) return "bg-green-100 text-green-700";
  if (pct >= 80) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function getScoreLabel(score: number) {
  if (score >= 90) return { label: "Sangat Baik", color: "bg-green-100 text-green-700" };
  if (score >= 80) return { label: "Baik", color: "bg-blue-100 text-blue-700" };
  if (score >= 70) return { label: "Cukup", color: "bg-yellow-100 text-yellow-700" };
  return { label: "Perlu Peningkatan", color: "bg-red-100 text-red-700" };
}

export default function KpiDashboardPage() {
  const [kpis, setKpis] = useState<EmployeeKpi[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodLabel, setPeriodLabel] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const kpiParams = new URLSearchParams({ limit: "100", status: "active" });
      if (periodLabel) kpiParams.set("period_label", periodLabel);

      const reviewParams = new URLSearchParams({ limit: "100" });
      if (periodLabel) reviewParams.set("period_label", periodLabel);

      const [kpiRes, reviewRes] = await Promise.all([
        fetch(`/api/hris/employee-kpis?${kpiParams}`),
        fetch(`/api/hris/performance-reviews?${reviewParams}`),
      ]);

      const kpiJson = await kpiRes.json();
      const reviewJson = await reviewRes.json();

      setKpis(kpiJson.data || []);
      setReviews(reviewJson.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [periodLabel]);

  useEffect(() => {
    const t = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const totalKpis = kpis.length;
  const avgAchievement = totalKpis > 0
    ? Math.round(kpis.reduce((sum, k) => sum + (k.achievement_percentage || 0), 0) / totalKpis)
    : 0;
  const kpisAbove100 = kpis.filter(k => (k.achievement_percentage || 0) >= 100).length;
  const reviewsApproved = reviews.filter(r => r.status === "approved").length;

  const employeeMap = new Map<string, { name: string; dept: string; total: number; count: number; }>();
  kpis.forEach(k => {
    const eid = k.employee?.id;
    if (!eid) return;
    const existing = employeeMap.get(eid);
    if (existing) {
      existing.total += (k.achievement_percentage || 0);
      existing.count += 1;
    } else {
      employeeMap.set(eid, {
        name: k.employee.full_name,
        dept: k.employee.department?.name || "",
        total: k.achievement_percentage || 0,
        count: 1,
      });
    }
  });

  const employeePerformance = Array.from(employeeMap.entries()).map(([id, v]) => ({
    id,
    name: v.name,
    dept: v.dept,
    avgAchievement: Math.round(v.total / v.count),
    kpiCount: v.count,
  })).sort((a, b) => b.avgAchievement - a.avgAchievement);

  const topPerformers = employeePerformance.slice(0, 5);
  const bottomPerformers = employeePerformance.slice(-5).reverse();

  const categoryStats = kpis.reduce((acc, k) => {
    const cat = k.category || "Lainnya";
    if (!acc[cat]) acc[cat] = { count: 0, totalAchievement: 0 };
    acc[cat].count += 1;
    acc[cat].totalAchievement += k.achievement_percentage || 0;
    return acc;
  }, {} as Record<string, { count: number; totalAchievement: number }>);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard KPI</h1>
          <p className="text-sm text-gray-500">Ringkasan performa dan pencapaian KPI karyawan</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Filter periode..."
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" onClick={() => setPeriodLabel("")}>Reset</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <ChartBarIcon className="w-4 h-4" />
                  Total KPI Aktif
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{totalKpis}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <TrophyIcon className="w-4 h-4" />
                  Rata-rata Capaian
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getAchievementColor(avgAchievement)}`}>{avgAchievement}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <CheckBadgeIcon className="w-4 h-4" />
                  KPI Tercapai (≥100%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{kpisAbove100}</div>
                <div className="text-xs text-gray-400 mt-1">dari {totalKpis} KPI</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <UserGroupIcon className="w-4 h-4" />
                  Review Disetujui
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{reviewsApproved}</div>
                <div className="text-xs text-gray-400 mt-1">dari {reviews.length} review</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <TrophyIcon className="w-5 h-5" />
                  Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topPerformers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Belum ada data</p>
                ) : (
                  <div className="space-y-3">
                    {topPerformers.map((emp, idx) => (
                      <div key={emp.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? "bg-yellow-100 text-yellow-700" :
                            idx === 1 ? "bg-gray-100 text-gray-700" :
                            idx === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-gray-50 text-gray-500"
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{emp.name}</div>
                            <div className="text-xs text-gray-400">{emp.dept} · {emp.kpiCount} KPI</div>
                          </div>
                        </div>
                        <Badge className={getAchievementBadge(emp.avgAchievement)}>
                          {emp.avgAchievement}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  Perlu Perhatian
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bottomPerformers.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Belum ada data</p>
                ) : (
                  <div className="space-y-3">
                    {bottomPerformers.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.dept} · {emp.kpiCount} KPI</div>
                        </div>
                        <Badge className={getAchievementBadge(emp.avgAchievement)}>
                          {emp.avgAchievement}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {Object.keys(categoryStats).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Capaian per Kategori KPI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(categoryStats).map(([cat, stats]) => {
                    const avg = Math.round(stats.totalAchievement / stats.count);
                    return (
                      <div key={cat} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">{cat}</div>
                        <div className={`text-xl font-bold ${getAchievementColor(avg)}`}>{avg}%</div>
                        <div className="text-xs text-gray-400">{stats.count} KPI</div>
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${avg >= 100 ? "bg-green-500" : avg >= 80 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(avg, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Review Terbaru</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Karyawan</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Periode</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-500">Skor</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Predikat</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.slice(0, 10).map(r => {
                        const scoreInfo = getScoreLabel(r.overall_score || 0);
                        return (
                          <tr key={r.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-3">
                              <div className="font-medium">{r.employee?.full_name}</div>
                              <div className="text-xs text-gray-400">{r.employee?.department?.name}</div>
                            </td>
                            <td className="py-3 px-3 text-gray-600">{r.period_label}</td>
                            <td className={`py-3 px-3 text-right font-bold ${getAchievementColor(r.overall_score || 0)}`}>
                              {r.overall_score ?? "-"}
                            </td>
                            <td className="py-3 px-3">
                              {r.overall_score != null && (
                                <Badge className={scoreInfo.color}>{scoreInfo.label}</Badge>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <Badge className={r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "submitted" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}>
                                {r.status === "approved" ? "Disetujui" : r.status === "submitted" ? "Disubmit" : "Draft"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
