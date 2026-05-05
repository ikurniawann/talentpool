"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { PencilIcon, TrashIcon, PlusIcon, BriefcaseIcon } from "@heroicons/react/24/outline";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface Position {
  id: string;
  title: string;
  department: string;
  level: string;
  is_active: boolean;
  created_at: string;
}

const LEVEL_OPTIONS = ["Staff", "Senior Staff", "Supervisor", "Assistant Manager", "Manager", "Senior Manager", "General Manager", "Director", "C-Level"];
const EMPTY_FORM = { title: "", department_name: "", level: "Staff", is_active: true };

export default function PositionsPage() {
  const { toasts, toast, dismiss } = useToast();
  const [data, setData] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const [posRes, deptRes] = await Promise.all([
      window.fetch("/api/master/positions"),
      window.fetch("/api/master/departments"),
    ]);
    const posJson = await posRes.json();
    const deptJson = await deptRes.json();
    setData(posJson.data || []);
    setDepartments(deptJson.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setDialog("add");
  }

  function openEdit(item: Position) {
    setSelected(item);
    setForm({ title: item.title, department_name: item.department || "", level: item.level || "Staff", is_active: item.is_active });
    setDialog("edit");
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast("Nama jabatan wajib diisi", "error");
      return;
    }
    setSaving(true);
    const url = dialog === "edit" ? `/api/master/positions/${selected!.id}` : "/api/master/positions";
    const payload = { ...form, department: form.department_name };
    const res = await window.fetch(url, {
      method: dialog === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) { toast(json.error || "Gagal menyimpan", "error"); }
    else {
      toast(json.message || "Berhasil disimpan");
      setDialog(null);
      fetch();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await window.fetch(`/api/master/positions/${deleteId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { toast(json.error || "Gagal menghapus", "error"); }
    else { toast(json.message || "Berhasil dihapus"); fetch(); }
    setDeleteId(null);
    setDeleting(false);
  }

  const filtered = data.filter(
    (d) => d.title.toLowerCase().includes(search.toLowerCase()) || (d.department || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BriefcaseIcon className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Master Jabatan</h1>
            <p className="text-sm text-gray-500">{data.length} jabatan terdaftar</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-1">
          <PlusIcon className="w-4 h-4" /> Tambah Jabatan
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Input
            placeholder="Cari jabatan atau departemen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm mb-4"
          />
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BriefcaseIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Belum ada jabatan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-600">Nama Jabatan</th>
                    <th className="text-left p-3 font-medium text-gray-600">Departemen</th>
                    <th className="text-left p-3 font-medium text-gray-600">Level</th>
                    <th className="text-left p-3 font-medium text-gray-600">Status</th>
                    <th className="text-right p-3 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-gray-900">{item.title}</td>
                      <td className="p-3 text-gray-500">{item.department || "-"}</td>
                      <td className="p-3">
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{item.level || "-"}</span>
                      </td>
                      <td className="p-3">
                        <Badge className={item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                          {item.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50">
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteId(item.id)} className="p-1.5 text-red-500 hover:bg-red-50">
                            <TrashIcon className="w-4 h-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === "edit" ? "Edit Jabatan" : "Tambah Jabatan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Nama Jabatan *</label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. HR Manager" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Departemen</label>
              <Select value={form.department_name} onValueChange={(v) => setForm((f) => ({ ...f, department_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Level</label>
              <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active_pos" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="is_active_pos" className="text-sm text-gray-700">Aktif</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Jabatan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">Jabatan yang masih digunakan karyawan tidak dapat dihapus.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
