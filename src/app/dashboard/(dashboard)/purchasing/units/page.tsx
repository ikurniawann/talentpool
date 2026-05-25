"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
import { Loader2, Pencil, Plus, Scale, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Unit, UnitFormData } from "@/types/purchasing";
import {
  listUnits,
  createUnit,
  updateUnit,
  updateUnitStatus,
  deleteUnit,
} from "@/lib/purchasing";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const TIPE_OPTIONS = [
  { value: "BESAR", label: "Satuan Besar" },
  { value: "KECIL", label: "Satuan Kecil" },
  { value: "KONVERSI", label: "Satuan Konversi" },
];

function normalizeUnitFormData(formData: UnitFormData): UnitFormData {
  return {
    kode: formData.kode.trim().toUpperCase(),
    nama: formData.nama.trim(),
    tipe: formData.tipe,
    deskripsi: formData.deskripsi?.trim() || undefined,
  };
}

export default function UnitsPage() {
  const logger = useActivityLogger();
  
  // State
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<UnitFormData>({
    kode: "",
    nama: "",
    tipe: "BESAR",
    deskripsi: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    unit: Unit | null;
    nextStatus: boolean;
  }>({
    open: false,
    unit: null,
    nextStatus: true,
  });

  // ── Fetch ───────────────────────────────────────────────────

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listUnits({
        search: search || undefined,
        page,
        limit,
      });
      setUnits(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.total_pages);
    } catch (error: unknown) {
      console.error("Error loading units:", error);
      toast.error("Gagal memuat data satuan");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  // ── Actions ──────────────────────────────────────────────────

  const handleOpenAdd = () => {
    setEditingUnit(null);
    setFormData({
      kode: "",
      nama: "",
      tipe: "BESAR",
      deskripsi: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({
      kode: unit.kode,
      nama: unit.nama,
      tipe: unit.tipe,
      deskripsi: unit.deskripsi || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (unit: Unit) => {
    setDeletingUnit(unit);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const payload = normalizeUnitFormData(formData);
    if (!payload.kode) {
      toast.error("Kode satuan wajib diisi");
      return;
    }
    if (!payload.nama) {
      toast.error("Nama satuan wajib diisi");
      return;
    }
    if (!payload.tipe) {
      toast.error("Tipe satuan wajib dipilih");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, payload);
        logger.updateRawMaterial("Satuan Updated", payload.kode || "N/A", `Updated ${payload.nama}`);
        toast.success("Satuan berhasil diupdate");
      } else {
        await createUnit(payload);
        logger.createRawMaterial("Satuan Created", payload.kode || "N/A", {
          nama: payload.nama,
          tipe: payload.tipe,
        });
        toast.success("Satuan berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchUnits();
    } catch (error: unknown) {
      console.error("Error saving unit:", error);
      toast.error(getErrorMessage(error, "Gagal menyimpan satuan"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUnit) return;
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteUnit(deletingUnit.id);
      toast.success("Satuan berhasil dihapus");
      setIsDeleteDialogOpen(false);
      setDeletingUnit(null);
      fetchUnits();
    } catch (error: unknown) {
      console.error("Error deleting unit:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus satuan"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    const unit = statusDialog.unit;
    if (!unit) return;
    if (statusUpdatingId) return;

    setStatusUpdatingId(unit.id);
    try {
      await updateUnitStatus(unit.id, statusDialog.nextStatus);
      toast.success(`Satuan berhasil ${statusDialog.nextStatus ? "diaktifkan" : "dinonaktifkan"}`);
      setStatusDialog({ open: false, unit: null, nextStatus: true });
      fetchUnits();
    } catch (error: unknown) {
      console.error("Error updating unit status:", error);
      toast.error(getErrorMessage(error, "Gagal mengubah status satuan"));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────

  const getTipeBadge = (tipe: string) => {
    switch (tipe) {
      case "BESAR":
        return <Badge className="bg-blue-100 text-blue-700">Satuan Besar</Badge>;
      case "KECIL":
        return <Badge className="bg-green-100 text-green-700">Satuan Kecil</Badge>;
      case "KONVERSI":
        return <Badge className="bg-purple-100 text-purple-700">Konversi</Badge>;
      default:
        return <Badge>{tipe}</Badge>;
    }
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Master Data", href: "/dashboard/purchasing/main" },
          { label: "Satuan" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Satuan</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola satuan ukuran untuk bahan baku dan produk — {total} total
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Tambah Satuan
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-gray-950">Daftar Satuan</h2>
              <p className="text-xs text-gray-500">Kelola satuan besar, kecil, dan konversi untuk pembelian dan stok.</p>
            </div>
          </div>
          <label className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari satuan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-white pl-9 pr-9 text-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </div>

        <div>
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-600" />
              <p className="mt-2 text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : units.length === 0 ? (
            <div className="py-14 text-center">
              <Scale className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">
                {search ? "Tidak ada satuan yang cocok dengan pencarian" : "Belum ada data satuan"}
              </p>
              {!search && (
                <Button variant="outline" onClick={handleOpenAdd} className="mt-4">
                  Tambah Satuan Pertama
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Kode</th>
                      <th className="px-4 py-3 text-left font-semibold">Nama</th>
                      <th className="px-4 py-3 text-left font-semibold">Tipe</th>
                      <th className="px-4 py-3 text-left font-semibold">Deskripsi</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-950">{unit.kode}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{unit.nama}</td>
                        <td className="px-4 py-3">{getTipeBadge(unit.tipe)}</td>
                        <td className="max-w-[320px] truncate px-4 py-3 text-gray-600">
                          {unit.deskripsi || "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={unit.is_active}
                              disabled={statusUpdatingId === unit.id}
                              onCheckedChange={(checked) =>
                                setStatusDialog({ open: true, unit, nextStatus: checked })
                              }
                              aria-label={`Ubah status ${unit.nama}`}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => handleOpenEdit(unit)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-red-500 hover:text-red-600"
                              onClick={() => handleOpenDelete(unit)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PurchasingTablePagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={limit}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </section>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="overflow-hidden border border-gray-200/70 p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-gray-200/70 px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {editingUnit ? "Edit Satuan" : "Tambah Satuan"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              {editingUnit
                ? "Ubah data satuan yang sudah ada"
                : "Tambahkan satuan baru untuk bahan baku"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="kode" className="text-sm font-medium">
                  Kode Satuan <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="kode"
                  value={formData.kode}
                  onChange={(e) =>
                    setFormData({ ...formData, kode: e.target.value })
                  }
                  placeholder="Contoh: KG"
                  maxLength={10}
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nama" className="text-sm font-medium">
                  Nama Satuan <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  placeholder="Contoh: Kilogram"
                  maxLength={50}
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tipe" className="text-sm font-medium">
                  Tipe Satuan <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={TIPE_OPTIONS}
                  value={formData.tipe}
                  onChange={(value) =>
                    setFormData({ ...formData, tipe: value as "BESAR" | "KECIL" | "KONVERSI" })
                  }
                  placeholder="Pilih tipe satuan..."
                  searchPlaceholder="Cari tipe satuan..."
                  emptyMessage="Tipe satuan tidak ditemukan"
                  className="!w-full h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deskripsi" className="text-sm font-medium">
                  Deskripsi
                </Label>
                <Textarea
                  id="deskripsi"
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Deskripsi opsional"
                  rows={3}
                  className="min-h-24 resize-none border-gray-200/70 bg-white px-3 py-2 text-sm focus-visible:border-gray-300 focus-visible:ring-1 focus-visible:ring-gray-200"
                />
              </div>
            </div>
            <DialogFooter className="m-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
                className="purchasing-secondary-button"
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="purchasing-main-button">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Confirmation Dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open && !statusUpdatingId) {
            setStatusDialog({ open: false, unit: null, nextStatus: true });
          }
        }}
      >
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">
              {statusDialog.nextStatus ? "Aktifkan Satuan?" : "Nonaktifkan Satuan?"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin {statusDialog.nextStatus ? "mengaktifkan" : "menonaktifkan"} satuan &quot;{statusDialog.unit?.nama}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setStatusDialog({ open: false, unit: null, nextStatus: true })}
              disabled={Boolean(statusUpdatingId)}
              className="purchasing-secondary-button"
            >
              Batal
            </Button>
            <Button onClick={handleConfirmToggleStatus} disabled={Boolean(statusUpdatingId)} className="purchasing-main-button">
              {statusUpdatingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {statusUpdatingId
                ? "Menyimpan..."
                : statusDialog.nextStatus
                  ? "Aktifkan"
                  : "Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">Hapus Satuan?</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin menghapus satuan &quot;{deletingUnit?.nama}
              &quot;? Data akan disembunyikan dari daftar. Satuan yang sudah digunakan di bahan baku tidak bisa dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="purchasing-secondary-button"
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="purchasing-main-button">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
