"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BriefcaseIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useToast, ToastContainer } from "@/components/ui/toast";

type SortField = "full_name" | "employee_code" | "hire_date" | "status" | "brand";
type SortDir = "asc" | "desc";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  resigned: "bg-red-100 text-red-700",
};

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SortableHeader({
  label,
  field,
  currentSort,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: { field: SortField; dir: SortDir };
  onSort: (f: SortField) => void;
}) {
  const isActive = currentSort.field === field;
  return (
    <button
      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-700"
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        currentSort.dir === "asc" ? (
          <ArrowUpIcon className="w-3 h-3" />
        ) : (
          <ArrowDownIcon className="w-3 h-3" />
        )
      ) : null}
    </button>
  );
}

export default function StaffPage() {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();

  const [staff, setStaff] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Sorting
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({
    field: "full_name",
    dir: "asc",
  });

  // Dialogs
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    full_name: "",
    employee_code: "",
    email: "",
    phone: "",
    brand_id: "",
    position_id: "",
    hire_date: "",
    status: "active",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams();
    if (brandFilter !== "all") params.set("brand_id", brandFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    const [staffRes, brandsRes, positionsRes] = await Promise.all([
      fetch(`/api/staff?${params}`),
      supabase.from("brands").select("*").eq("is_active", true).order("name"),
      supabase.from("positions").select("*").eq("is_active", true).order("title"),
    ]);

    const staffData = await staffRes.json();
    setStaff(staffData.data || []);
    setBrands(brandsRes.data || []);
    setPositions(positionsRes.data || []);
    setLoading(false);
  }, [brandFilter, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSort(field: SortField) {
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  }

  const sorted = [...staff].sort((a, b) => {
    let av: any = a[sort.field];
    let bv: any = b[sort.field];
    if (sort.field === "brand") {
      av = a.brands?.name || "";
      bv = b.brands?.name || "";
    }
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  function openAdd() {
    setForm({
      full_name: "",
      employee_code: "",
      email: "",
      phone: "",
      brand_id: brands[0]?.id || "",
      position_id: "",
      hire_date: new Date().toISOString().split("T")[0],
      status: "active",
      notes: "",
    });
    setSelected(null);
    setDialog("add");
  }

  function openEdit(s: any) {
    setForm({
      full_name: s.full_name,
      employee_code: s.employee_code,
      email: s.email || "",
      phone: s.phone || "",
      brand_id: s.brand_id || "",
      position_id: s.position_id || "",
      hire_date: s.hire_date || "",
      status: s.status || "active",
      notes: s.notes || "",
    });
    setSelected(s);
    setDialog("edit");
  }

  async function handleSave() {
    if (!form.full_name || !form.employee_code || !form.brand_id || !form.hire_date) return;
    setSaving(true);

    if (dialog === "add") {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast("Gagal menambah staff: " + err.error, "error");
      } else {
        toast("Staff berhasil ditambahkan");
      }
    } else if (dialog === "edit" && selected) {
      const res = await fetch(`/api/staff/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast("Gagal update staff: " + err.error, "error");
      } else {
        toast("Staff berhasil diupdate");
      }
    }

    setSaving(false);
    setDialog(null);
    fetchData();
  }

  async function handleDelete(s: any) {
    if (!confirm(`Hapus staff "${s.full_name}"?`)) return;
    const res = await fetch(`/api/staff/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      toast("Gagal hapus staff: " + err.error, "error");
    } else {
      toast("Staff berhasil dihapus");
    }
    fetchData();
  }

  const activeCount = staff.filter((s) => s.status === "active").length;
  const inactiveCount = staff.filter((s) => s.status === "inactive").length;
  const resignedCount = staff.filter((s) => s.status === "resigned").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-500 text-sm mt-1">
            {staff.length} staff · {activeCount} aktif · {inactiveCount} nonaktif · {resignedCount} resign
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <PlusIcon className="w-4 h-4" /> Tambah Staff
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{staff.length}</p>
            <p className="text-xs text-gray-500">Total Staff</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
            <p className="text-xs text-gray-500">Aktif</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-gray-600">{inactiveCount}</p>
            <p className="text-xs text-gray-500">Nonaktif</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-red-700">{resignedCount}</p>
            <p className="text-xs text-gray-500">Resign</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari nama, kode, telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Semua Outlet">
              {brandFilter !== "all" ? (brands.find(b => String(b.id) === brandFilter)?.name ?? '') : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Outlet</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
            <SelectItem value="resigned">Resign</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchData}>Refresh</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left p-3 pr-2">
                    <SortableHeader label="Nama" field="full_name" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left p-3 pr-2">
                    <SortableHeader label="Kode" field="employee_code" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left p-3 pr-2">
                    <SortableHeader label="Outlet" field="brand" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left p-3 pr-2">Posisi</th>
                  <th className="text-left p-3 pr-2">
                    <SortableHeader label="Tanggal Masuk" field="hire_date" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left p-3 pr-2">
                    <SortableHeader label="Status" field="status" currentSort={sort} onSort={handleSort} />
                  </th>
                  <th className="text-left p-3 pr-2">Kontak</th>
                  <th className="text-right p-3 pl-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      Memuat...
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <BriefcaseIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      Belum ada staff
                    </td>
                  </tr>
                ) : (
                  sorted.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="p-3 pr-2">
                        <div className="font-medium text-gray-900">{s.full_name}</div>
                      </td>
                      <td className="p-3 pr-2">
                        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                          {s.employee_code}
                        </span>
                      </td>
                      <td className="p-3 pr-2 text-gray-600">{s.brands?.name || "-"}</td>
                      <td className="p-3 pr-2 text-gray-600">{s.positions?.title || "-"}</td>
                      <td className="p-3 pr-2 text-gray-600">{formatDate(s.hire_date)}</td>
                      <td className="p-3 pr-2">
                        <Badge className={STATUS_COLORS[s.status] || "bg-gray-100 text-gray-600"}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className="p-3 pr-2">
                        <div className="space-y-0.5 text-xs text-gray-500">
                          {s.phone && (
                            <p className="flex items-center gap-1">
                              <PhoneIcon className="w-3 h-3" /> {s.phone}
                            </p>
                          )}
                          {s.email && (
                            <p className="flex items-center gap-1">
                              <EnvelopeIcon className="w-3 h-3" /> {s.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 pl-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(s)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(s)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog === "add" ? "Tambah Staff" : "Edit Staff"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nama Lengkap *</label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Nama staff"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Kode Staff *</label>
                <Input
                  value={form.employee_code}
                  onChange={(e) => setForm((f) => ({ ...f, employee_code: e.target.value }))}
                  placeholder="e.g. STF-001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@contoh.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Telepon</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Outlet *</label>
                <Select value={form.brand_id || ""} onValueChange={(v) => setForm((f) => ({ ...f, brand_id: v ?? "", position_id: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Outlet">
                      {form.brand_id ? (brands.find(b => String(b.id) === form.brand_id)?.name ?? '') : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Posisi</label>
                <Select value={form.position_id || ""} onValueChange={(v) => setForm((f) => ({ ...f, position_id: v ?? "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Posisi">
                      {form.position_id ? (positions.find(p => String(p.id) === form.position_id)?.title ?? '') : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {positions.filter((p) => p.brand_id === form.brand_id).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Tanggal Masuk *</label>
                <Input
                  type="date"
                  value={form.hire_date}
                  onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Status</label>
                <Select value={form.status || "active"} onValueChange={(v) => setForm((f) => ({ ...f, status: v ?? "active" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                    <SelectItem value="resigned">Resign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Catatan</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan tambahan"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : dialog === "add" ? "Tambah" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
