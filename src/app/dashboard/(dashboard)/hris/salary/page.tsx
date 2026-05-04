"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  PencilIcon,
} from "@heroicons/react/24/outline";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface EmployeeSalary {
  id: string;
  employee_id: string;
  base_salary: number;
  fixed_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  ptkp_status: string;
  is_taxable: boolean;
  is_active: boolean;
  effective_date: string;
  employee?: {
    id: string;
    full_name: string;
    nip: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function SalaryPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState<EmployeeSalary[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const [newSalary, setNewSalary] = useState({
    employee_id: "",
    base_salary: "",
    fixed_allowance: "0",
    transport_allowance: "0",
    meal_allowance: "0",
    ptkp_status: "TK/0",
    is_taxable: true,
  });

  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
  }, []);

  async function fetchSalaries() {
    try {
      const res = await fetch("/api/hris/employee-salary?active_only=true");
      const json = await res.json();
      if (json.data) {
        setSalaries(json.data.filter((s: any) => s.is_active));
      }
    } catch (error) {
      console.error("Error fetching salaries:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch("/api/hris/employees");
      const json = await res.json();
      if (json.data) {
        setEmployees(json.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }

  async function handleCreateSalary() {
    if (!newSalary.employee_id || !newSalary.base_salary) {
      showToast("Employee dan base salary wajib diisi", "error");
      return;
    }

    try {
      const res = await fetch("/api/hris/employee-salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: newSalary.employee_id,
          base_salary: parseFloat(newSalary.base_salary),
          fixed_allowance: parseFloat(newSalary.fixed_allowance),
          transport_allowance: parseFloat(newSalary.transport_allowance),
          meal_allowance: parseFloat(newSalary.meal_allowance),
          ptkp_status: newSalary.ptkp_status,
          is_taxable: newSalary.is_taxable,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Gagal membuat salary", "error");
        return;
      }

      showToast("Salary structure berhasil dibuat", "success");
      setShowNewDialog(false);
      fetchSalaries();
      setNewSalary({
        employee_id: "",
        base_salary: "",
        fixed_allowance: "0",
        transport_allowance: "0",
        meal_allowance: "0",
        ptkp_status: "TK/0",
        is_taxable: true,
      });
    } catch (error) {
      console.error("Error creating salary:", error);
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
          <h1 className="text-2xl font-bold text-gray-900">Salary Structure</h1>
          <p className="text-sm text-gray-500">Kelola struktur gaji karyawan</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="bg-pink-600 hover:bg-pink-700">
          <PlusIcon className="w-4 h-4 mr-2" />
          Tambah Salary
        </Button>
      </div>

      {/* Salary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Salary Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Karyawan</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Gaji Pokok</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Tunjangan Tetap</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Transport</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Makan</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status PTKP</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Efektif</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {salaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      Belum ada salary structure. Klik "Tambah Salary" untuk membuat.
                    </td>
                  </tr>
                ) : (
                  salaries.map((salary) => (
                    <tr key={salary.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{salary.employee?.full_name}</div>
                          <div className="text-xs text-gray-500">{salary.employee?.nip}</div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">
                        {formatCurrency(salary.base_salary)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(salary.fixed_allowance)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(salary.transport_allowance)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(salary.meal_allowance)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge>{salary.ptkp_status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(salary.effective_date).toLocaleDateString("id-ID")}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/hris/salary/${salary.id}`)}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Salary Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Salary Structure</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Karyawan</label>
              <select
                value={newSalary.employee_id}
                onChange={(e) => setNewSalary({ ...newSalary, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Pilih karyawan</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.nip})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Gaji Pokok</label>
              <Input
                type="number"
                value={newSalary.base_salary}
                onChange={(e) => setNewSalary({ ...newSalary, base_salary: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tunjangan Tetap</label>
              <Input
                type="number"
                value={newSalary.fixed_allowance}
                onChange={(e) => setNewSalary({ ...newSalary, fixed_allowance: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tunjangan Transport</label>
              <Input
                type="number"
                value={newSalary.transport_allowance}
                onChange={(e) => setNewSalary({ ...newSalary, transport_allowance: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tunjangan Makan</label>
              <Input
                type="number"
                value={newSalary.meal_allowance}
                onChange={(e) => setNewSalary({ ...newSalary, meal_allowance: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status PTKP</label>
              <select
                value={newSalary.ptkp_status}
                onChange={(e) => setNewSalary({ ...newSalary, ptkp_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="TK/0">TK/0</option>
                <option value="TK/1">TK/1</option>
                <option value="TK/2">TK/2</option>
                <option value="TK/3">TK/3</option>
                <option value="K/0">K/0</option>
                <option value="K/1">K/1</option>
                <option value="K/2">K/2</option>
                <option value="K/3">K/3</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateSalary} className="bg-pink-600 hover:bg-pink-700">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
