"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrophyIcon, 
  TrendingUpIcon, 
  UsersIcon, 
  TargetIcon,
  CheckCircle2Icon,
  ArrowUpIcon,
  MedalIcon,
  ChartPieIcon
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface EmployeeKpi {
  id: string;
  name: string;
  category: string;
  target: number;
  actual_value: number | null;
  achievement_percentage: number | null;
  unit: string;
  period_label: string;
  status: string;
  weight: number | null;
  employee: { 
    id: string; 
    full_name: string; 
    nip: string; 
    department?: { name: string };
    position?: { title: string };
  };
}

interface PerformanceReview {
  id: string;
  period_label: string;
  overall_score: number | null;
  status: string;
  employee: { 
    id: string; 
    full_name: string; 
    department?: { name: string };
  };
}

const COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function KpiDashboardPage() {
  const [kpis, setKpis] = useState<EmployeeKpi[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [periodFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const kpiParams = new URLSearchParams({ limit: "500", status: "active" });
      if (periodFilter) kpiParams.set("period_label", periodFilter);

      const reviewParams = new URLSearchParams({ limit: "100" });
      if (periodFilter) reviewParams.set("period_label", periodFilter);

      const [kpiRes, reviewRes] = await Promise.all([
        fetch(`/api/hris/employee-kpis?${kpiParams}`),
        fetch(`/api/hris/performance-reviews?${reviewParams}`),
      ]);

      const kpiJson = await kpiRes.json();
      const reviewJson = await reviewRes.json();

      setKpis(kpiJson.data || []);
      setReviews(reviewJson.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalKpis: kpis.length,
    activeKpis: kpis.filter(k => k.status === "active").length,
    avgAchievement: kpis.length > 0 
      ? kpis.reduce((sum, k) => sum + (k.achievement_percentage || 0), 0) / kpis.length 
      : 0,
    onTrack: kpis.filter(k => (k.achievement_percentage || 0) >= 80).length,
    behind: kpis.filter(k => (k.achievement_percentage || 0) < 80).length,
    completed: kpis.filter(k => k.status === "completed").length,
  };

  // Top performers by average achievement
  const topPerformers = (() => {
    const employeeStats: Record<string, { name: string; dept: string; achievements: number[] }> = {};
    
    kpis.forEach(k => {
      if (!employeeStats[k.employee.id]) {
        employeeStats[k.employee.id] = {
          name: k.employee.full_name,
          dept: k.employee.department?.name || "-",
          achievements: [],
        };
      }
      if (k.achievement_percentage !== null) {
        employeeStats[k.employee.id].achievements.push(k.achievement_percentage);
      }
    });

    return Object.entries(employeeStats)
      .map(([id, data]) => ({
        id,
        name: data.name,
        dept: data.dept,
        avgAchievement: data.achievements.length > 0
          ? data.achievements.reduce((a, b) => a + b, 0) / data.achievements.length
          : 0,
      }))
      .sort((a, b) => b.avgAchievement - a.avgAchievement)
      .slice(0, 5);
  })();

  // Department performance
  const departmentPerformance = (() => {
    const deptStats: Record<string, { achievements: number[]; count: number }> = {};
    
    kpis.forEach(k => {
      const deptName = k.employee.department?.name || "No Department";
      if (!deptStats[deptName]) {
        deptStats[deptName] = { achievements: [], count: 0 };
      }
      deptStats[deptName].count++;
      if (k.achievement_percentage !== null) {
        deptStats[deptName].achievements.push(k.achievement_percentage);
      }
    });

    return Object.entries(deptStats)
      .map(([name, data]) => ({
        name,
        avgAchievement: data.achievements.length > 0
          ? data.achievements.reduce((a, b) => a + b, 0) / data.achievements.length
          : 0,
        kpiCount: data.count,
      }))
      .sort((a, b) => b.avgAchievement - a.avgAchievement);
  })();

  // Category distribution
  const categoryData = (() => {
    const categories: Record<string, number> = {};
    kpis.forEach(k => {
      categories[k.category || "Other"] = (categories[k.category || "Other"] || 0) + 1;
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  })();

  // Achievement distribution for pie chart
  const achievementDistribution = [
    { name: "Sangat Baik (≥100%)", value: kpis.filter(k => (k.achievement_percentage || 0) >= 100).length, color: "#22c55e" },
    { name: "Baik (80-99%)", value: kpis.filter(k => (k.achievement_percentage || 0) >= 80 && (k.achievement_percentage || 0) < 100).length, color: "#eab308" },
    { name: "Cukup (60-79%)", value: kpis.filter(k => (k.achievement_percentage || 0) >= 60 && (k.achievement_percentage || 0) < 80).length, color: "#f97316" },
    { name: "Perlu Perbaikan (<60%)", value: kpis.filter(k => (k.achievement_percentage || 0) < 60).length, color: "#ef4444" },
  ];

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-gray-500 py-12">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard KPI & Performance</h1>
          <p className="text-sm text-gray-500">Overview kinerja karyawan dan pencapaian KPI</p>
        </div>
        <input
          type="text"
          placeholder="Filter periode (contoh: Q1 2026)"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TargetIcon className="w-4 h-4" />
              Total KPI Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stats.activeKpis}</div>
            <div className="flex items-center text-xs">
              <span className="text-gray-500">Dari total {stats.totalKpis} KPI</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4" />
              Rata-rata Pencapaian
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold mb-2 ${stats.avgAchievement >= 80 ? "text-green-600" : stats.avgAchievement >= 60 ? "text-yellow-600" : "text-red-600"}`}>
              {stats.avgAchievement.toFixed(1)}%
            </div>
            <Progress value={stats.avgAchievement} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle2Icon className="w-4 h-4" />
              On Track
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.onTrack}</div>
            <div className="flex items-center text-xs text-gray-500">
              <ArrowUpIcon className="w-3 h-3 mr-1 text-green-600" />
              {(stats.onTrack / (stats.onTrack + stats.behind) * 100 || 0).toFixed(0)}% dari KPI
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              Karyawan Dinilai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">{reviews.length}</div>
            <div className="text-xs text-gray-500">
              {reviews.filter(r => r.status === "completed").length} review selesai
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Achievement Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartPieIcon className="w-5 h-5" />
              Distribusi Pencapaian KPI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={achievementDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {achievementDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="w-5 h-5" />
              KPI per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers & Department Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="w-5 h-5 text-yellow-600" />
              Top 5 Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Belum ada data KPI</p>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((performer, index) => (
                  <div key={performer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? "bg-yellow-500" :
                        index === 1 ? "bg-gray-400" :
                        index === 2 ? "bg-orange-500" :
                        "bg-blue-500"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{performer.name}</p>
                        <p className="text-xs text-gray-500">{performer.dept}</p>
                      </div>
                    </div>
                    <Badge className={`${
                      performer.avgAchievement >= 100 ? "bg-green-100 text-green-700" :
                      performer.avgAchievement >= 80 ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {performer.avgAchievement.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Performance per Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departmentPerformance.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Belum ada data</p>
            ) : (
              <div className="space-y-3">
                {departmentPerformance.map((dept) => (
                  <div key={dept.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">{dept.name}</span>
                      <span className={`font-bold ${
                        dept.avgAchievement >= 80 ? "text-green-600" :
                        dept.avgAchievement >= 60 ? "text-yellow-600" :
                        "text-red-600"
                      }`}>
                        {dept.avgAchievement.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={dept.avgAchievement} className="h-2" />
                    <p className="text-xs text-gray-500">{dept.kpiCount} KPI</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Active KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MedalIcon className="w-5 h-5" />
            KPI Aktif Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kpis.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Belum ada KPI aktif</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Karyawan</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">KPI</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Target</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Aktual</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Pencapaian</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.slice(0, 10).map(k => (
                    <tr key={k.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-900">{k.employee.full_name}</div>
                        <div className="text-xs text-gray-400">{k.employee.department?.name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{k.name}</div>
                        <div className="text-xs text-gray-400">{k.category}</div>
                      </td>
                      <td className="py-3 px-3 text-right">{k.target} {k.unit}</td>
                      <td className="py-3 px-3 text-right">{k.actual_value ?? "-"} {k.actual_value != null ? k.unit : ""}</td>
                      <td className={`py-3 px-3 text-right font-bold ${
                        (k.achievement_percentage || 0) >= 100 ? "text-green-600" :
                        (k.achievement_percentage || 0) >= 80 ? "text-yellow-600" :
                        "text-red-600"
                      }`}>
                        {k.achievement_percentage != null ? `${k.achievement_percentage.toFixed(1)}%` : "-"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={
                          k.status === "active" ? "bg-blue-100 text-blue-700" :
                          k.status === "completed" ? "bg-green-100 text-green-700" :
                          "bg-gray-100 text-gray-700"
                        }>
                          {k.status === "active" ? "Aktif" : k.status === "completed" ? "Selesai" : k.status}
                        </Badge>
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
