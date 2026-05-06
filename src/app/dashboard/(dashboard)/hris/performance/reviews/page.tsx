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

interface Review {
  id: string;
  period_label: string;
  overall_score: number;
  kpi_score: number;
  behavior_score: number;
  status: string;
  created_at: string;
  employee: { id: string; full_name: string; nip: string; department?: { name: string } };
  reviewer: { id: string; full_name: string };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Disubmit",
  approved: "Disetujui",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
};

function getScoreColor(score: number) {
  if (score >= 85) return "text-green-600 font-bold";
  if (score >= 70) return "text-yellow-600 font-medium";
  return "text-red-600 font-medium";
}

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [periodLabel, setPeriodLabel] = useState("");
  const [total, setTotal] = useState(0);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (status !== "all") params.set("status", status);
      if (periodLabel) params.set("period_label", periodLabel);

      const res = await fetch(`/api/hris/performance-reviews?${params}`);
      const json = await res.json();
      setReviews(json.data || []);
      setTotal(json.pagination?.total || 0);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [status, periodLabel]);

  useEffect(() => {
    const t = setTimeout(() => fetchReviews(), 300);
    return () => clearTimeout(t);
  }, [fetchReviews]);

  const avgScore = reviews.length > 0
    ? Math.round(reviews.reduce((sum, r) => sum + (r.overall_score || 0), 0) / reviews.length * 10) / 10
    : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Review</h1>
          <p className="text-sm text-gray-500">Kelola penilaian kinerja karyawan</p>
        </div>
        <Button onClick={() => router.push("/dashboard/hris/performance/reviews/new")} className="bg-green-600 hover:bg-green-700">
          <PlusIcon className="w-4 h-4 mr-2" />
          Buat Review
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{reviews.filter(r => r.status === "draft").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Disetujui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{reviews.filter(r => r.status === "approved").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Rata-rata Skor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-3">
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
                <SelectItem value="submitted">Disubmit</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="font-medium">Belum ada performance review</p>
              <p className="text-sm mt-1">Klik "Buat Review" untuk memulai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Karyawan</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Reviewer</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Periode</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Skor KPI</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Skor Perilaku</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Skor Total</th>
                    <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="font-medium">{r.employee?.full_name}</div>
                        <div className="text-xs text-gray-400">{r.employee?.department?.name}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{r.reviewer?.full_name || "-"}</td>
                      <td className="py-3 px-3 text-gray-600">{r.period_label}</td>
                      <td className={`py-3 px-3 text-right ${getScoreColor(r.kpi_score)}`}>
                        {r.kpi_score ?? "-"}
                      </td>
                      <td className={`py-3 px-3 text-right ${getScoreColor(r.behavior_score)}`}>
                        {r.behavior_score ?? "-"}
                      </td>
                      <td className={`py-3 px-3 text-right ${getScoreColor(r.overall_score)}`}>
                        {r.overall_score ?? "-"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge className={STATUS_COLORS[r.status]}>
                          {STATUS_LABELS[r.status]}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/hris/performance/reviews/${r.id}`)}
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
