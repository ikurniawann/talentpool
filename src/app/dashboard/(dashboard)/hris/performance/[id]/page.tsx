"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast, ToastContainer } from "@/components/ui/toast";
import {
  ArrowLeftIcon,
  PrinterIcon,
  PencilIcon,
  TrashIcon,
  DocumentCheckIcon,
  ChartBarIcon,
  HeartIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

interface BehavioralItem {
  id: string;
  value_name: string;
  competency?: string;
  behavioral_standard?: string;
  score_1_description?: string;
  score_2_description?: string;
  score_3_description?: string;
  score_4_description?: string;
  score_5_description?: string;
  score: number;
  weight: number;
  weighted_score: number;
  notes?: string;
}

interface DevelopmentPlanItem {
  id: string;
  competency_area: string;
  development_action: string;
  target_completion_date: string;
  status: string;
  progress_percentage: number;
  resources_required?: string;
}

interface KpiTemplateItemFromReview {
  id: string;
  perspective: string;
  kpi_name: string;
  kpi_definition: string;
  target_text?: string;
  target_value: number;
  actual_value: number;
  weight: number;
  measurement_unit: string;
  frequency: string;
  score: number;
  score_label: string;
  weighted_score?: number;
  actual_quality: number;
  actual_quantity: number;
  actual_timeliness: number;
  quality_actual?: number;
  quantity_actual?: number;
  timeliness_actual?: number;
}

interface KpiTemplateFromReview {
  id: string;
  template_name: string;
  department?: { name: string };
  position?: { title: string };
  applicable_period?: string;
}

interface PerformanceReviewDetail {
  id: string;
  employee_id: string;
  period_label: string;
  start_date: string;
  end_date: string;
  status: string;
  total_work_result_score: number;
  total_behavioral_score: number;
  total_project_score: number;
  grand_total_score: number;
  category: string;
  reviewer_name?: string;
  reviewer_position?: string;
  reviewee_sign_date?: string;
  reviewer_sign_date?: string;
  employee_sign_date?: string;
  self_assessment?: string;
  reviewer_notes?: string;
  manager_notes?: string;
  kpi_template_id?: string;
  template?: KpiTemplateFromReview;
  employee?: { id: string; full_name: string; job_title?: string; department?: { name: string } };
  created_at: string;
  kpis?: KpiTemplateItemFromReview[];
  behavioral?: BehavioralItem[];
  developments?: DevelopmentPlanItem[];
}

export default function PerformanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [review, setReview] = useState<PerformanceReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReview = useCallback(async () => {
    try {
      const { id } = await params;
      const res = await fetch(`/api/hris/performance/reviews/${id}`);
      const json = await res.json();

      if (res.ok) {
        setReview(json.data);
      } else {
        showToast(json.error || "Gagal memuat data", "error");
      }
    } catch {
      showToast("Terjadi kesalahan", "error");
    } finally {
      setLoading(false);
    }
  }, [params, showToast]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const handleDelete = async () => {
    if (!confirm("Yakin ingin menghapus performance review ini?")) return;

    try {
      const { id } = await params;
      const res = await fetch(`/api/hris/performance/reviews?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Berhasil dihapus", "success");
        router.push("/dashboard/hris/performance");
      } else {
        const json = await res.json();
        showToast(json.error || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Terjadi kesalahan", "error");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Outstanding": return <Badge className="bg-purple-500 text-white">Outstanding</Badge>;
      case "Exceed Expectation": return <Badge className="bg-green-500 text-white">Exceed</Badge>;
      case "Meet Expectation": return <Badge className="bg-blue-500 text-white">Meet</Badge>;
      case "Need Improvement": return <Badge className="bg-yellow-500 text-white">Need Improvement</Badge>;
      case "Unacceptable": return <Badge variant="destructive">Unacceptable</Badge>;
      default: return <Badge>{category || "-"}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="outline">Draft</Badge>;
      case "submitted": return <Badge variant="secondary">Submitted</Badge>;
      case "reviewed": return <Badge className="bg-blue-500 text-white">Reviewed</Badge>;
      case "finalized": return <Badge className="bg-green-500 text-white">Finalized</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!review) return <div className="p-6 text-center text-red-500">Review tidak ditemukan</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Detail Performance Review</h1>
            <p className="text-sm text-gray-500">{review.employee?.full_name} — {review.period_label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <PrinterIcon className="w-4 h-4 mr-1" /> Cetak
          </Button>
          <Button variant="default" onClick={() => router.push(`/dashboard/hris/performance/${review.id}/edit`)}>
            <PencilIcon className="w-4 h-4 mr-1" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <TrashIcon className="w-4 h-4 mr-1" /> Hapus
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="summary">Ringkasan</TabsTrigger>
          <TabsTrigger value="rkk">RKK & Realisasi</TabsTrigger>
          <TabsTrigger value="5c">Values 5C</TabsTrigger>
          <TabsTrigger value="plan">Development Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {review.kpi_template_id && review.template && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DocumentCheckIcon className="w-5 h-5" /> Template KPI yang Digunakan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nama Template</p>
                    <p className="font-medium">{review.template.template_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Departemen</p>
                    <p className="font-medium">{review.template.department?.name || "All"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posisi</p>
                    <p className="font-medium">{review.template.position?.title || "All"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Periode</p>
                    <p className="font-medium">{review.template.applicable_period || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DocumentCheckIcon className="w-5 h-5" /> Hasil Penilaian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Skor Total</p>
                  <p className="text-3xl font-bold text-gray-900">{review.grand_total_score}</p>
                  <p className="text-xs text-gray-400">/ 500</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Kategori</p>
                  <div className="mt-2">{getCategoryBadge(review.category)}</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-2">{getStatusBadge(review.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="font-semibold">Hasil Kerja</p>
                  <p>{review.total_work_result_score?.toFixed(2) || "0"}</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded">
                  <p className="font-semibold">Perilaku</p>
                  <p>{review.total_behavioral_score?.toFixed(2) || "0"}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-semibold">Periode</p>
                  <p>{review.period_label}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-semibold">Tanggal</p>
                  <p>{review.start_date} s/d {review.end_date}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tanda Tangan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="font-semibold mb-8">Karyawan yang Dinilai</p>
                  <div className="border-t pt-2">
                    <p className="text-sm">{review.employee?.full_name}</p>
                    {review.reviewee_sign_date && <p className="text-xs text-gray-500">Tgl: {review.reviewee_sign_date}</p>}
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold mb-8">Reviewer (Atasan Langsung)</p>
                  <div className="border-t pt-2">
                    <p className="text-sm">{review.reviewer_name || "-"}</p>
                    <p className="text-xs text-gray-500">{review.reviewer_position || ""}</p>
                    {review.reviewer_sign_date && <p className="text-xs text-gray-500">Tgl: {review.reviewer_sign_date}</p>}
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold mb-8">Employee HR / DMS</p>
                  <div className="border-t pt-2">
                    <p className="text-sm">Departemen HRM/HRD</p>
                    {review.employee_sign_date && <p className="text-xs text-gray-500">Tgl: {review.employee_sign_date}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rkk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5" /> RKK & Realisasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {review.kpis && review.kpis.length > 0 ? (
                  <div className="space-y-4">
                    {review.kpis.map((kpi) => {
                      const qualityActual = kpi.actual_quality ?? kpi.quality_actual ?? 0;
                      const quantityActual = kpi.actual_quantity ?? kpi.quantity_actual ?? 0;
                      const timelinessActual = kpi.actual_timeliness ?? kpi.timeliness_actual ?? 0;
                      return (
                      <div key={kpi.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">{kpi.perspective}</Badge>
                              <span className="text-xs text-gray-500">{kpi.frequency}</span>
                            </div>
                            <p className="font-semibold text-lg">{kpi.kpi_name}</p>
                            {kpi.kpi_definition && (
                              <p className="text-sm text-gray-500 mt-1">{kpi.kpi_definition}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Target: {kpi.target_text || "-"}</p>
                            <p className="text-sm font-bold text-blue-600">Score: {kpi.score}/5 ({kpi.score_label})</p>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Realisasi (Quality, Quantity, Timeliness):</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-xs text-gray-600">Quality</span>
                              </div>
                              <p className="text-sm font-semibold">{qualityActual}%</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-xs text-gray-600">Quantity</span>
                              </div>
                              <p className="text-sm font-semibold">{quantityActual}%</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                <span className="text-xs text-gray-600">Timeliness</span>
                              </div>
                              <p className="text-sm font-semibold">{timelinessActual}%</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Weight</p>
                            <p className="font-semibold">{kpi.weight}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Avg Achievement</p>
                            <p className="font-semibold">{((qualityActual + quantityActual + timelinessActual) / 3).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Weighted Score</p>
                            <p className="font-semibold text-blue-600">{(kpi.weighted_score ?? kpi.score * kpi.weight).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    )})}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Total Skor Hasil Kerja (70%)</p>
                        <p className="text-xl font-bold text-blue-600">{review.total_work_result_score?.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Belum ada data RKK</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="5c" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartIcon className="w-5 h-5" /> Values 5C Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {review.behavioral && review.behavioral.length > 0 ? (
                  <div className="space-y-3">
                    {review.behavioral.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold">
                              {item.value_name}
                              {item.competency ? <span className="text-gray-500 text-sm ml-2">({item.competency})</span> : null}
                            </p>
                            {item.behavioral_standard && (
                              <p className="text-sm text-gray-600 mt-1">{item.behavioral_standard}</p>
                            )}
                            {item.notes && <p className="text-sm text-gray-500 mt-1">{item.notes}</p>}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-500">Bobot: {item.weight}%</p>
                            <p className="text-sm text-gray-500">Nilai: {item.score}/5</p>
                            <p className="font-semibold text-blue-600">Nilai x Bobot: {item.weighted_score?.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">Total Skor Perilaku</p>
                        <p className="text-xl font-bold text-blue-600">{review.total_behavioral_score?.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Belum ada data Values 5C</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AcademicCapIcon className="w-5 h-5" /> Development Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {review.developments && review.developments.length > 0 ? (
                  <div className="space-y-3">
                    {review.developments.map((plan) => (
                      <div key={plan.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-1">{plan.competency_area}</Badge>
                            <p className="font-semibold">{plan.development_action}</p>
                            {plan.resources_required && (
                              <p className="text-sm text-gray-500 mt-1">Resources: {plan.resources_required}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <Badge
                              variant={
                                plan.status === "Completed" ? "default" :
                                plan.status === "In Progress" ? "secondary" : "outline"
                              }
                              className="mb-1"
                            >
                              {plan.status}
                            </Badge>
                            <p className="text-sm text-gray-500">Target: {plan.target_completion_date}</p>
                            <p className="text-sm text-gray-500">Progress: {plan.progress_percentage}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Belum ada development plan</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
