"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

const STATUS_LABELS: Record<string, string> = {
  probation: "Probasi",
  contract: "Kontrak",
  permanent: "Tetap",
  internship: "Magang",
  resigned: "Resign",
  terminated: "PHK",
  suspended: "Suspend",
};

const STATUS_COLORS: Record<string, string> = {
  probation: "bg-yellow-100 text-yellow-700",
  contract: "bg-blue-100 text-blue-700",
  permanent: "bg-green-100 text-green-700",
  internship: "bg-purple-100 text-purple-700",
  resigned: "bg-red-100 text-red-600",
  terminated: "bg-red-200 text-red-700",
  suspended: "bg-orange-100 text-orange-700",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calculateTenure(joinDate: string) {
  const join = new Date(joinDate);
  const now = new Date();
  const years = now.getFullYear() - join.getFullYear();
  const months = now.getMonth() - join.getMonth();
  if (years > 0) return `${years}t ${Math.max(0, months)}b`;
  if (months > 0) return `${months} bln`;
  return "Baru";
}

export default function EmployeesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Summary stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    departments: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      sort_by: "full_name",
      sort_order: "asc",
    });
    if (search) params.set("search", search);
    if (departmentFilter !== "all") params.set("department_id", departmentFilter);
    if (statusFilter !== "all") params.set("employment_status", statusFilter);
    if (activeFilter !== "all") params.set("is_active", activeFilter);

    const res = await fetch(`/api/hris/employees?${params}`);
    const json = await res.json();
    setEmployees(json.data || []);
    setTotal(json.total || 0);
    setLoading(false);
  }, [page, search, departmentFilter, statusFilter, activeFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Fetch summary stats
  useEffect(() => {
    async function fetchStats() {
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('id, is_active, department_id', { count: 'exact', head: false });
      
      const { data: depts } = await supabase
        .from('departments')
        .select('id', { count: 'exact' });
      
      if (allEmployees) {
        const active = allEmployees.filter(e => e.is_active).length;
        const inactive = allEmployees.length - active;
        const deptCount = new Set(allEmployees.map(e => e.department_id).filter(Boolean)).size;
        
        setStats({
          total: allEmployees.length,
          active,
          inactive,
          departments: depts?.length || 0,
        });
      }
    }
    
    fetchStats();
  }, []);

  useEffect(() => {
    supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setDepartments(data || []));
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, departmentFilter, statusFilter, activeFilter]);

  const totalPages = Math.ceil(total / perPage);
  const activeCount = employees.filter((e) => e.is_active).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Karyawan</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Aktif</p>
                <p className="text-xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Nonaktif</p>
                <p className="text-xl font-bold text-red-600">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BuildingOfficeIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Departemen</p>
                <p className="text-xl font-bold text-gray-900">{stats.departments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Direktori Karyawan</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} karyawan · {activeCount} aktif di halaman ini
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/hris/employees/new")} className="gap-2">
          <PlusIcon className="w-4 h-4" /> Tambah Karyawan
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          <button
            onClick={() => router.push("/dashboard/hris/employees")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${pathname === "/dashboard/hris/employees"
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Semua Karyawan
          </button>
          <button
            onClick={() => router.push("/dashboard/hris/schedules")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${pathname.startsWith("/dashboard/hris/schedules")
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Schedules
          </button>
          <button
            onClick={() => router.push("/dashboard/hris/sections")}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${pathname.startsWith("/dashboard/hris/sections")
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Sections
          </button>
        </nav>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: total, color: "text-gray-900" },
          { label: "Tetap", value: "—", color: "text-green-700" },
          { label: "Kontrak", value: "—", color: "text-blue-700" },
          { label: "Probasi", value: "—", color: "text-yellow-700" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-3">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari nama, NIP, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua Departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Departemen</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Aktif / Nonaktif" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchEmployees}>Refresh</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left p-3">Karyawan</th>
                  <th className="text-left p-3">NIP</th>
                  <th className="text-left p-3">Departemen</th>
                  <th className="text-left p-3">Jabatan</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Bergabung</th>
                  <th className="text-left p-3">Kontak</th>
                  <th className="text-right p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full mx-auto mb-2" />
                      Memuat...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      Tidak ada karyawan ditemukan
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer"
                      onClick={() => router.push(`/dashboard/hris/employees/${emp.id}`)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {emp.photo_url ? (
                            <img
                              src={emp.photo_url}
                              alt={emp.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {emp.full_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{emp.full_name}</p>
                            <p className="text-xs text-gray-400">
                              {emp.is_active ? (
                                <span className="text-green-600">● Aktif</span>
                              ) : (
                                <span className="text-gray-400">● Nonaktif</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                          {emp.nip || "-"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-gray-700">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-xs">{emp.department?.name || "-"}</span>
                        </div>
                        {emp.section && (
                          <p className="text-xs text-gray-400 mt-0.5 ml-5">{emp.section.name}</p>
                        )}
                      </td>
                      <td className="p-3 text-gray-700 text-xs">
                        {emp.job_title?.title || "-"}
                      </td>
                      <td className="p-3">
                        <Badge className={STATUS_COLORS[emp.employment_status] || "bg-gray-100 text-gray-600"}>
                          {STATUS_LABELS[emp.employment_status] || emp.employment_status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(emp.join_date)}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {calculateTenure(emp.join_date)}
                        </p>
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5 text-xs text-gray-500">
                          {emp.phone && (
                            <p className="flex items-center gap-1">
                              <PhoneIcon className="w-3 h-3" /> {emp.phone}
                            </p>
                          )}
                          {emp.email && (
                            <p className="flex items-center gap-1">
                              <EnvelopeIcon className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{emp.email}</span>
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/hris/employees/${emp.id}`);
                            }}
                            className="text-gray-700 hover:text-blue-600 hover:border-blue-300"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Menampilkan {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} dari {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <span className="text-xs text-gray-600">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
