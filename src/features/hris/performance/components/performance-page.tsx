"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowPathIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { usePerformanceReviews } from "../queries";
import type { PerformanceReviewListItem } from "../types";

export function PerformancePage() {
  const router = useRouter();
  const { toasts, removeToast } = useToast();
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const reviewsQuery = usePerformanceReviews({
    period_label: periodFilter !== "all" ? periodFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 50,
  });
  const reviews = reviewsQuery.data ?? [];
  const loading = reviewsQuery.isLoading;
  const periods = [...new Set(reviews.map((r) => r.period_label))] as string[];
  const fetchReviews = () => reviewsQuery.refetch();

  const filteredReviews = reviews.filter((r: PerformanceReviewListItem) => {
    const searchLower = search.toLowerCase();
    const empName = r.employee?.full_name?.toLowerCase() || "";
    const empTitle = r.employee?.job_title?.toLowerCase() || "";
    const dept = r.employee?.department?.name?.toLowerCase() || "";
    return (
      empName.includes(searchLower) ||
      empTitle.includes(searchLower) ||
      dept.includes(searchLower) ||
      r.period_label.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "submitted":
        return <Badge variant="secondary">Submitted</Badge>;
      case "reviewed":
        return <Badge className="bg-blue-500 text-white">Reviewed</Badge>;
      case "finalized":
        return <Badge className="bg-green-500 text-white">Finalized</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Outstanding":
        return <Badge className="bg-purple-500 text-white">Outstanding</Badge>;
      case "Exceed Expectation":
        return <Badge className="bg-green-500 text-white">Exceed</Badge>;
      case "Meet Expectation":
        return <Badge className="bg-blue-500 text-white">Meet</Badge>;
      case "Need Improvement":
        return <Badge className="bg-yellow-500 text-white">Need Improvement</Badge>;
      case "Unacceptable":
        return <Badge variant="destructive">Unacceptable</Badge>;
      default:
        return <Badge>{category || "-"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Review</h1>
          <p className="text-gray-500 text-sm mt-1">Penilaian kinerja karyawan lengkap (RKK, 5C Values, Development Plan)</p>
        </div>
        <Button onClick={() => router.push("/dashboard/hris/performance/insert")} className="gap-2">
          <PlusIcon className="w-4 h-4" /> Review Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Review</p>
                <p className="text-2xl font-bold">{reviews.length}</p>
              </div>
              <ClipboardDocumentCheckIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-2xl font-bold text-purple-600">{reviews.filter((r) => r.category === "Outstanding").length}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Perlu Tindakan</p>
                <p className="text-2xl font-bold text-yellow-600">{reviews.filter((r) => r.category === "Need Improvement" || r.category === "Unacceptable").length}</p>
              </div>
              <AcademicCapIcon className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Periode Aktif</p>
                <p className="text-2xl font-bold">{periods.length}</p>
              </div>
              <DocumentTextIcon className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <CardTitle>Daftar Performance Review</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari karyawan, jabatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Periode</SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchReviews}>
                <ArrowPathIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Belum ada performance review</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Karyawan</th>
                    <th className="text-left py-3 px-2">Periode</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Skor Total</th>
                    <th className="text-left py-3 px-2">Kategori</th>
                    <th className="text-right py-3 px-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review) => (
                    <tr key={review.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="font-medium">{review.employee?.full_name || "-"}</div>
                        <div className="text-gray-500 text-xs">{review.employee?.job_title || "-"}</div>
                      </td>
                      <td className="py-3 px-2">{review.period_label}</td>
                      <td className="py-3 px-2">{getStatusBadge(review.status)}</td>
                      <td className="py-3 px-2 text-right font-mono font-semibold">{review.grand_total_score}</td>
                      <td className="py-3 px-2">{getCategoryBadge(review.category)}</td>
                      <td className="py-3 px-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/hris/performance/${review.id}`)}
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
