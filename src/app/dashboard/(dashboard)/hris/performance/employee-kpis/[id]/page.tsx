"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeftIcon, PlusIcon, TrendingUpIcon, CalendarIcon, UserIcon, TargetIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface EmployeeKpi {
  id: string;
  employee_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  weight: number | null;
  target: number | null;
  unit: string | null;
  actual_value: number | null;
  achievement_percentage: number | null;
  measurement_frequency: string | null;
  period_start: string;
  period_end: string;
  period_label: string | null;
  status: string;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    full_name: string;
    nip: string;
    photo_url?: string;
    department?: { name: string };
    position?: { title: string };
  };
}

interface ProgressUpdate {
  id: string;
  employee_kpi_id: string;
  actual_value: number;
  notes: string | null;
  evidence_url: string | null;
  updated_by: string | null;
  created_at: string;
  updater?: {
    full_name: string;
  };
}

export default function EmployeeKpiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [kpi, setKpi] = useState<EmployeeKpi | null>(null);
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [newActualValue, setNewActualValue] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchKpiDetail();
      fetchProgressUpdates();
    }
  }, [params.id]);

  const fetchKpiDetail = async () => {
    try {
      const response = await fetch(`/api/hris/employee-kpis/${params.id}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch KPI detail");
      }
      
      setKpi(result.data);
    } catch (error) {
      console.error("Error fetching KPI:", error);
      showToast("Gagal memuat detail KPI", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressUpdates = async () => {
    try {
      const response = await fetch(`/api/hris/employee-kpis/${params.id}/progress`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setProgressUpdates(result.data);
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newActualValue) {
      showToast("Nilai aktual harus diisi", "error");
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/hris/employee-kpis/${params.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actual_value: parseFloat(newActualValue),
          notes: newNotes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add progress");
      }

      showToast("Progress berhasil ditambahkan", "success");
      setNewActualValue("");
      setNewNotes("");
      setShowAddProgress(false);
      fetchKpiDetail();
      fetchProgressUpdates();
    } catch (error) {
      console.error("Error adding progress:", error);
      showToast("Gagal menambahkan progress", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getAchievementColor = (percentage: number | null) => {
    if (!percentage) return "bg-gray-200";
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 80) return "bg-yellow-500";
    if (percentage >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  const getAchievementLabel = (percentage: number | null) => {
    if (!percentage) return "Belum ada data";
    if (percentage >= 100) return "Sangat Baik";
    if (percentage >= 80) return "Baik";
    if (percentage >= 60) return "Cukup";
    return "Perlu Perbaikan";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            KPI tidak ditemukan
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      {/* Toast notifications */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <XCircleIcon className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="ml-2 hover:opacity-70">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/hris/performance/employee-kpis")}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detail KPI Karyawan</h1>
            <p className="text-sm text-gray-500">{kpi.period_label || `${kpi.period_start} - ${kpi.period_end}`}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddProgress(!showAddProgress)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Update Progress
        </Button>
      </div>

      {/* Employee Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Informasi Karyawan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nama</p>
              <p className="font-medium">{kpi.employee?.full_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">NIP</p>
              <p className="font-medium">{kpi.employee?.nip || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium">{kpi.employee?.department?.name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Jabatan</p>
              <p className="font-medium">{kpi.employee?.position?.title || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TargetIcon className="w-5 h-5" />
            {kpi.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpi.description && (
              <p className="text-sm text-gray-600">{kpi.description}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Kategori</p>
                <Badge variant="outline">{kpi.category || "-"}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bobot</p>
                <p className="font-medium">{kpi.weight || 0}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Target</p>
                <p className="font-medium">{kpi.target || 0} {kpi.unit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Frekuensi</p>
                <p className="font-medium">{kpi.measurement_frequency || "-"}</p>
              </div>
            </div>

            {/* Achievement */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="w-5 h-5 text-gray-500" />
                  <span className="font-medium">Pencapaian Saat Ini</span>
                </div>
                <Badge className={getAchievementColor(kpi.achievement_percentage)}>
                  {kpi.achievement_percentage ? `${kpi.achievement_percentage.toFixed(1)}%` : "0%"}
                </Badge>
              </div>
              
              <Progress 
                value={kpi.achievement_percentage || 0} 
                className="h-3"
              />
              
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-gray-500">
                  Aktual: <strong>{kpi.actual_value || 0} {kpi.unit}</strong>
                </span>
                <span className="text-gray-500">
                  Status: <strong className={kpi.achievement_percentage && kpi.achievement_percentage >= 80 ? "text-green-600" : "text-orange-600"}>
                    {getAchievementLabel(kpi.achievement_percentage)}
                  </strong>
                </span>
              </div>
            </div>

            {kpi.notes && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Catatan:</strong> {kpi.notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Progress Form */}
      {showAddProgress && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Update Progress Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProgress} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nilai Aktual *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newActualValue}
                  onChange={(e) => setNewActualValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder={`Target: ${kpi.target || 0} ${kpi.unit}`}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Catatan atau penjelasan tambahan..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddProgress(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  {submitting ? "Menyimpan..." : "Simpan Progress"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Progress History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Riwayat Progress ({progressUpdates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progressUpdates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Belum ada update progress
            </p>
          ) : (
            <div className="space-y-3">
              {progressUpdates.map((update, index) => (
                <div
                  key={update.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {update.actual_value} {kpi.unit}
                    </p>
                    {update.notes && (
                      <p className="text-sm text-gray-600 mt-1">{update.notes}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(update.created_at).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {update.updater && (
                    <Badge variant="outline" className="text-xs">
                      {update.updater.full_name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
