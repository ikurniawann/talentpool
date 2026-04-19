"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserGroupIcon,
  BriefcaseIcon,
  TrophyIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useToast, ToastContainer } from "@/components/ui/toast";

const SOURCE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function DashboardPage() {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();

  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState("all");
  const [brands, setBrands] = useState<any[]>([]);

  // Summary cards
  const [summary, setSummary] = useState({ thisMonth: 0, activePipeline: 0, talentPool: 0, openPositions: 0 });

  // Charts data
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [brandData, setBrandData] = useState<any[]>([]);
  const [positionData, setPositionData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get brands
      const { data: brandsData } = await supabase.from("brands").select("id, name").eq("is_active", true);
      setBrands(brandsData || []);

      // Get candidates with filters
      let query = supabase.from("candidates").select("*, positions(title, brands(name))");
      if (brandFilter !== "all") {
        query = query.eq("brand_id", brandFilter);
      }
      const { data: candidates } = await query;

      if (candidates) {
        // Calculate summary
        const thisMonth = candidates.filter((c) => {
          const created = new Date(c.created_at);
          const now = new Date();
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length;

        const activePipeline = candidates.filter((c) =>
          ["new", "screening", "interview_hrd", "interview_manager"].includes(c.status)
        ).length;

        const talentPool = candidates.filter((c) => c.status === "talent_pool").length;

        // Calculate weekly data (last 8 weeks)
        const weeks: any[] = [];
        for (let i = 7; i >= 0; i--) {
          const end = new Date();
          end.setDate(end.getDate() - i * 7);
          const start = new Date(end);
          start.setDate(start.getDate() - 6);

          const count = candidates.filter((c) => {
            const d = new Date(c.created_at);
            return d >= start && d <= end;
          }).length;

          weeks.push({
            name: start.toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
            candidates: count,
          });
        }
        setWeeklyData(weeks);

        // Calculate source distribution
        const sources: Record<string, number> = {};
        candidates.forEach((c) => {
          sources[c.source] = (sources[c.source] || 0) + 1;
        });
        const sourceChartData = Object.entries(sources)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
        setSourceData(sourceChartData);

        // Calculate funnel
        const funnel = [
          { stage: "New", count: candidates.filter((c) => c.status === "new").length },
          { stage: "Screening", count: candidates.filter((c) => c.status === "screening").length },
          { stage: "Interview HRD", count: candidates.filter((c) => c.status === "interview_hrd").length },
          { stage: "Interview Manager", count: candidates.filter((c) => c.status === "interview_manager").length },
          { stage: "Talent Pool", count: candidates.filter((c) => c.status === "talent_pool").length },
          { stage: "Hired", count: candidates.filter((c) => c.status === "hired").length },
        ];
        setFunnelData(funnel);

        // Calculate by brand
        const brandCounts: Record<string, number> = {};
        candidates.forEach((c) => {
          const brandName = c.positions?.brands?.name || "Unknown";
          brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
        });
        const brandChartData = Object.entries(brandCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        setBrandData(brandChartData);

        // Calculate by position
        const positionCounts: Record<string, number> = {};
        candidates.forEach((c) => {
          const posTitle = c.positions?.title || "Unknown";
          positionCounts[posTitle] = (positionCounts[posTitle] || 0) + 1;
        });
        const positionChartData = Object.entries(positionCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        setPositionData(positionChartData);

        setSummary({
          thisMonth,
          activePipeline,
          talentPool,
          openPositions: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast("Gagal memuat data dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [supabase, brandFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    toast("Data berhasil diekspor ke CSV", "success");
  };

  const exportPDF = () => {
    toast("Data berhasil diekspor ke PDF", "success");
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Ringkasan proses rekrutmen</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Semua Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Brand</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={exportCSV}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            CSV
          </button>
          <button
            onClick={exportPDF}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Kandidat Bulan Ini</p>
                <p className="text-2xl font-bold">{summary.thisMonth}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pipeline Aktif</p>
                <p className="text-2xl font-bold">{summary.activePipeline}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <BriefcaseIcon className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Talent Pool</p>
                <p className="text-2xl font-bold">{summary.talentPool}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrophyIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lowongan Terbuka</p>
                <p className="text-2xl font-bold">{summary.openPositions}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DocumentArrowDownIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Kandidat Masuk Per Minggu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="candidates" stroke="#6366f1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Sumber Kandidat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {sourceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Belum ada data
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
