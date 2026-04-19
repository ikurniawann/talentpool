"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useToast, ToastContainer } from "@/components/ui/toast";

export default function SectionStaffPage() {
  const supabase = createClient();
  const { toasts, toast, dismiss } = useToast();

  const [staff, setStaff] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [staffSections, setStaffSections] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [brandFilter, setBrandFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [staffSearch, setStaffSearch] = useState("");

  // Dialogs
  const [sectionDialog, setSectionDialog] = useState<any | null>(null);
  const [addSectionDialog, setAddSectionDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [newSection, setNewSection] = useState({ name: "", code: "", brand_id: "", color: "#6B7280" });
  const [assignSection, setAssignSection] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);

    const brandParam = brandFilter !== "all" ? `brand_id=${brandFilter}` : "";
    const [staffRes, sectionsRes, staffSectionsRes, brandsRes] = await Promise.all([
      fetch(`/api/staff?${brandParam}${brandParam ? "&" : ""}status=active`),
      fetch(`/api/sections${brandFilter !== "all" ? `?brand_id=${brandFilter}` : ""}`),
      fetch("/api/staff-sections"),
      supabase.from("brands").select("*").eq("is_active", true).order("name"),
    ]);

    const [staffData, sectionsData, staffSectionsData, brandsData] = await Promise.all([
      staffRes.json(),
      sectionsRes.json(),
      staffSectionsRes.json(),
      brandsRes,
    ]);

    setStaff(staffData.data || []);
    setSections(sectionsData.data || []);
    setStaffSections(staffSectionsData.data || []);
    setBrands(brandsData.data || []);
    setLoading(false);
  }, [brandFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getStaffSections(staffId: string) {
    return staffSections.filter((ss) => ss.staff_id === staffId);
  }

  function getSectionStaff(sectionId: string) {
    return staffSections.filter((ss) => ss.section_id === sectionId);
  }

  async function handleCreateSection() {
    if (!newSection.name || !newSection.code || !newSection.brand_id) {
      toast("Nama, kode, dan outlet wajib diisi.", "error");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSection),
    });
    const data = await res.json();
    if (!res.ok) {
      toast("Gagal membuat section: " + data.error, "error");
    } else {
      toast("Section berhasil dibuat");
    }
    setSaving(false);
    setAddSectionDialog(false);
    setNewSection({ name: "", code: "", brand_id: newSection.brand_id, color: "#6B7280" });
    fetchData();
  }

  async function handleAssignSection(st: any) {
    if (!assignSection) return;
    setSaving(true);
    const res = await fetch("/api/staff-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: st.id, section_id: assignSection }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast("Gagal menempatkan staff: " + data.error, "error");
    } else {
      toast("Staff berhasil ditempatkan di section");
    }
    setSaving(false);
    setSectionDialog(null);
    setAssignSection("");
    fetchData();
  }

  async function handleRemoveSection(staffId: string, sectionId: string) {
    const res = await fetch(`/api/staff-sections?staff_id=${staffId}&section_id=${sectionId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      toast("Gagal menghapus staff dari section: " + err.error, "error");
    } else {
      toast("Staff berhasil dikeluarkan dari section");
    }
    fetchData();
  }

  async function handleDeleteSection(sec: any) {
    if (!confirm(`Hapus section "${sec.name}"?`)) return;
    const res = await fetch(`/api/sections?id=${sec.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      toast("Gagal hapus section: " + err.error, "error");
    } else {
      toast("Section berhasil dihapus");
      setSectionFilter("all");
    }
    fetchData();
  }

  const filteredStaff = staff.filter((s) =>
    (s.full_name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.employee_code.toLowerCase().includes(staffSearch.toLowerCase())) &&
    (!sectionFilter || getStaffSections(s.id).some((ss) => ss.section_id === sectionFilter) || !sectionFilter)
  );

  const brandSections = sections.filter((sec) => !brandFilter || brandFilter === "all" || sec.brand_id === brandFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Section Staff</h1>
          <p className="text-gray-500 text-sm mt-1">
            Kelola penempatan staff di setiap section / area
          </p>
        </div>
        <Button onClick={() => setAddSectionDialog(true)} className="gap-2">
          <PlusIcon className="w-4 h-4" /> Tambah Section
        </Button>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {brandSections.map((sec) => {
          const sectionStaff = getSectionStaff(sec.id);
          return (
            <Card
              key={sec.id}
              className={`border-l-4 cursor-pointer hover:shadow-md transition-all ${
                sectionFilter === sec.id ? "ring-2 ring-blue-500" : ""
              }`}
              style={{ borderLeftColor: sec.color }}
              onClick={() => setSectionFilter(sectionFilter === sec.id ? "all" : sec.id)}
            >
              <CardContent className="pt-3 pb-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-sm">{sec.name}</p>
                    <p className="text-xs text-gray-400">{sec.code}</p>
                  </div>
                  <Badge className="bg-gray-100 text-gray-600 text-xs ml-1">
                    {sectionStaff.length}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {sec.brands?.name || ""}
                </p>
                <div className="flex gap-1 mt-2">
                  <button
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec); }}
                  >
                    Hapus
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {brandSections.length === 0 && !loading && (
          <div className="col-span-full text-center py-8 text-gray-400">
            <Squares2X2Icon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Belum ada section. Klik &quot;Tambah Section&quot; untuk membuat.
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v ?? "all"); setSectionFilter("all"); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua Outlet" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Outlet</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari staff..."
            value={staffSearch}
            onChange={(e) => setStaffSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchData}>Refresh</Button>
      </div>

      {/* Staff Section Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Staff</th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase">Section</th>
                  <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-gray-400">Memuat...</td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-gray-400">
                      <Squares2X2Icon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      Tidak ada staff
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s) => {
                    const assigned = getStaffSections(s.id);
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="p-3">
                          <div className="font-medium text-gray-900">{s.full_name}</div>
                          <div className="text-xs text-gray-400">{s.employee_code} · {s.brands?.name}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {assigned.map((ss) => (
                              <Badge
                                key={ss.id}
                                className="text-xs"
                                style={{ backgroundColor: (ss.sections as any)?.color + "20", color: (ss.sections as any)?.color }}
                              >
                                {(ss.sections as any)?.name || "?"}
                                <button
                                  className="ml-1 hover:text-red-600"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveSection(s.id, ss.section_id); }}
                                >
                                  ×
                                </button>
                              </Badge>
                            ))}
                            {assigned.length === 0 && (
                              <span className="text-xs text-gray-300">Belum ditempatkan</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSectionDialog(s);
                              setAssignSection("");
                            }}
                          >
                            + Tempatkan
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Section Dialog */}
      <Dialog open={addSectionDialog} onOpenChange={(o) => !o && setAddSectionDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Section</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Nama Section *</label>
              <Input
                value={newSection.name}
                onChange={(e) => setNewSection((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Kitchen, Cashier, Dining"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Kode *</label>
              <Input
                value={newSection.code}
                onChange={(e) => setNewSection((s) => ({ ...s, code: e.target.value }))}
                placeholder="e.g. KIT, CAS, DIN"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Outlet *</label>
              <Select value={newSection.brand_id || ""} onValueChange={(v) => setNewSection((s) => ({ ...s, brand_id: v ?? "" }))}>
                <SelectTrigger>
                  <SelectValue placeholder={(() => {
                    const found = brands.find(b => String(b.id) === String(newSection.brand_id));
                    return found ? found.name : "Pilih Outlet";
                  })()} />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Warna</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newSection.color}
                  onChange={(e) => setNewSection((s) => ({ ...s, color: e.target.value }))}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={newSection.color}
                  onChange={(e) => setNewSection((s) => ({ ...s, color: e.target.value }))}
                  className="w-28 font-mono text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSectionDialog(false)}>Batal</Button>
            <Button onClick={handleCreateSection} disabled={saving}>
              {saving ? "Menyimpan..." : "Buat Section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Section Dialog */}
      <Dialog open={sectionDialog !== null} onOpenChange={(o) => !o && setSectionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tempatkan Staff</DialogTitle>
            <p className="text-xs text-gray-500">
              {sectionDialog?.full_name} · {sectionDialog?.employee_code}
            </p>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-gray-600">Pilih Section</label>
            <Select value={assignSection || ""} onValueChange={(v) => setAssignSection(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={(() => {
                  const found = sections.find(sec => String(sec.id) === String(assignSection));
                  return found ? `${found.name} (${found.code})` : "Pilih Section";
                })()} />
              </SelectTrigger>
              <SelectContent>
                {sections
                  .filter((sec) => !sectionDialog || sec.brand_id === sectionDialog.brand_id)
                  .map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: sec.color }}
                        />
                        {sec.name} ({sec.code})
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(null)}>Batal</Button>
            <Button onClick={() => handleAssignSection(sectionDialog)} disabled={saving || !assignSection}>
              {saving ? "Menyimpan..." : "Tempatkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
