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
import { PencilIcon, TrashIcon, PlusIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { useToast, ToastContainer } from "@/components/ui/toast";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = { name: "", code: "", description: "", is_active: true };

export default function DepartmentsPage() {
  const { toasts, toast, dismiss } = useToast();
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    const res = await window.fetch("/api/master/departments");
    const json = await res.json();
    setData(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  function openAdd() {
    setForm(EMPTY_FORM);
    setSelected(null);
    setDialog("add");
  }

  function openEdit(item: Department) {
    setSelected(item);
    setForm({ name: item.name, code: item.code, description: item.description || "", is_active: item.is_active });
    setDialog("edit");
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      toast("Nama dan kode wajib diisi", "error");
      return;
    }
    setSaving(true);
    const url = dialog === "edit" ? `/api/master/departments/${selected!.id}` : "/api/master/departments";
    const res = await window.fetch(url, {
      method: dialog === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
    const res = await window.fetch(`/api/master/departments/${deleteId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { toast(json.error || "Gagal menghapus", "error"); }
    else { toast(json.message || "Berhasil dihapus"); fetch(); }
    setDeleteId(null);
    setDeleting(false);
  }

  const filtered = data.filter(
    (d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Master Departemen</h1>
            <p className="text-sm text-gray-500">{data.length} departemen terdaftar</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-1">
          <PlusIcon className="w-4 h-4" /> Tambah Departemen
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <Input
            placeholder="Cari nama atau kode..."
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
              <BuildingOfficeIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Belum ada departemen
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-600">Nama</th>
                    <th className="text-left p-3 font-medium text-gray-600">Kode</th>
                    <th className="text-left p-3 font-medium text-gray-600">Deskripsi</th>
                    <th className="text-left p-3 font-medium text-gray-600">Status</th>
                    <th className="text-right p-3 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-gray-900">{item.name}</td>
                      <td className="p-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{item.code}</span>
                      </td>
                      <td className="p-3 text-gray-500">{item.description || "-"}</td>
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
            <DialogTitle>{dialog === "edit" ? "Edit Departemen" : "Tambah Departemen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Nama Departemen *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Human Resources" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Kode *</label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. HR" maxLength={20} />
              <p className="text-xs text-gray-400 mt-0.5">Kode unik, huruf kapital otomatis</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Deskripsi</label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Opsional" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active_dept" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="is_active_dept" className="text-sm text-gray-700">Aktif</label>
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
            <DialogTitle>Hapus Departemen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">Departemen yang masih digunakan karyawan tidak dapat dihapus.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Menghapus..." : "Hapus"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
