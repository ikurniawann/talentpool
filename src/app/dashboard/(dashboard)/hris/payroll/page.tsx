"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BanknotesIcon,
  PlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface PayrollRun {
  id: string;
  run_name: string;
  period_month: number;
  period_year: number;
  status: string;
  total_employees: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  created_at: string;
  processed_at?: string;
  approved_at?: string;
  paid_at?: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  processing: "Processing",
  completed: "Completed",
  paid: "Paid",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  processing: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getMonthName(month: number): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  return months[month - 1] || "";
}

export default function PayrollPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newPeriodMonth, setNewPeriodMonth] = useState(new Date().getMonth() + 1);
  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  async function fetchPayrollRuns() {
    try {
      const res = await fetch("/api/hris/payroll");
      const json = await res.json();
      if (json.data) {
        setPayrollRuns(json.data);
      }
    } catch (error) {
      console.error("Error fetching payroll runs:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePayroll() {
    setCreating(true);
    try {
      const res = await fetch("/api/hris/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_month: newPeriodMonth,
          period_year: newPeriodYear,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Gagal membuat payroll", "error");
        return;
      }

      showToast("Payroll run berhasil dibuat", "success");
      setShowNewDialog(false);
      fetchPayrollRuns();
    } catch (error) {
      console.error("Error creating payroll:", error);
      showToast("Terjadi kesalahan", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleCalculate(runId: string) {
    try {
      showToast("Sedang menghitung payroll...", "info");
      
      const res = await fetch(`/api/hris/payroll/${runId}/calculate`, {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Gagal menghitung payroll", "error");
        return;
      }

      showToast(`Payroll dihitung untuk ${json.summary?.total_employees || 0} karyawan`, "success");
      fetchPayrollRuns();
    } catch (error) {
      console.error("Error calculating payroll:", error);
      showToast("Terjadi kesalahan", "error");
    }
  }

  async function handleUpdateStatus(runId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/hris/payroll/${runId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Gagal update status", "error");
        return;
      }

      showToast(`Status diubah ke ${STATUS_LABELS[newStatus]}`, "success");
      fetchPayrollRuns();
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Terjadi kesalahan", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll & Benefits</h1>
          <p className="text-sm text-gray-500">Kelola penggajian, slip gaji, dan pinjaman karyawan</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="bg-pink-600 hover:bg-pink-700">
          <PlusIcon className="w-4 h-4 mr-2" />
          Payroll Baru
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Payroll Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollRuns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Dalam Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollRuns.filter(r => r.status === "draft").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollRuns.filter(r => r.status === "completed").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payrollRuns.filter(r => r.status === "paid").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Periode</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Nama</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Karyawan</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total Gross</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Total Net</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Belum ada payroll run. Klik "Payroll Baru" untuk membuat.
                    </td>
                  </tr>
                ) : (
                  payrollRuns.map((run) => (
                    <tr key={run.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {getMonthName(run.period_month)} {run.period_year}
                      </td>
                      <td className="py-3 px-4">{run.run_name}</td>
                      <td className="py-3 px-4">
                        <Badge className={STATUS_COLORS[run.status]}>
                          {STATUS_LABELS[run.status]}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4">{run.total_employees || 0}</td>
                      <td className="text-right py-3 px-4 font-medium">
                        {formatCurrency(run.total_gross || 0)}
                      </td>
                      <td className="text-right py-3 px-4 font-medium text-green-600">
                        {formatCurrency(run.total_net || 0)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/hris/payroll/${run.id}`)}
                          >
                            <DocumentTextIcon className="w-4 h-4" />
                          </Button>
                          {run.status === "draft" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleCalculate(run.id)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(run.id, "processing")}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                Process
                              </Button>
                            </>
                          )}
                          {run.status === "processing" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(run.id, "completed")}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                          )}
                          {run.status === "completed" && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(run.id, "paid")}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Payroll Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Payroll Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
              <Select value={String(newPeriodMonth)} onValueChange={(v) => setNewPeriodMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {getMonthName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
              <Input
                type="number"
                value={newPeriodYear}
                onChange={(e) => setNewPeriodYear(parseInt(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreatePayroll}
              disabled={creating}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {creating ? "Membuat..." : "Buat Payroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
