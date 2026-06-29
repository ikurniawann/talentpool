"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import {
  FormFieldLabel,
  formComboboxClassName,
  formInputClassName,
} from "@/components/layout/form-field";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
import { Loader2, Pencil, Plus, Scale, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Unit, UnitFormData } from "@/types/purchasing";
import { useUnitList } from "../queries";
import { useCreateUnit, useUpdateUnit, useUpdateUnitStatus, useDeleteUnit } from "../mutations";

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

export function UnitsPage() {
  const logger = useActivityLogger();

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

  const listQuery = useUnitList({ search: search || undefined, page, limit });
  const units = listQuery.data?.data ?? [];
  const total = listQuery.data?.pagination.total ?? 0;
  const totalPages = listQuery.data?.pagination.total_pages ?? 1;
  const loading = listQuery.isLoading;

  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit();
  const statusMutation = useUpdateUnitStatus();
  const deleteMutation = useDeleteUnit();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const statusUpdatingId = statusMutation.isPending
    ? statusMutation.variables?.id ?? null
    : null;

  useEffect(() => {
    if (listQuery.isError) {
      console.error("Error loading units:", listQuery.error);
      toast.error("Gagal memuat data satuan");
    }
  }, [listQuery.isError, listQuery.error]);

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

    try {
      if (editingUnit) {
        await updateMutation.mutateAsync({ id: editingUnit.id, payload });
        logger.updateRawMaterial("Satuan Updated", payload.kode || "N/A", `Updated ${payload.nama}`);
        toast.success("Satuan berhasil diupdate");
      } else {
        await createMutation.mutateAsync(payload);
        logger.createRawMaterial("Satuan Created", payload.kode || "N/A", {
          nama: payload.nama,
          tipe: payload.tipe,
        });
        toast.success("Satuan berhasil ditambahkan");
      }
      setIsDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error saving unit:", error);
      toast.error(getErrorMessage(error, "Gagal menyimpan satuan"));
    }
  };

  const handleDelete = async () => {
    if (!deletingUnit) return;
    if (isDeleting) return;

    try {
      await deleteMutation.mutateAsync(deletingUnit.id);
      toast.success("Satuan berhasil dihapus");
      setIsDeleteDialogOpen(false);
      setDeletingUnit(null);
    } catch (error: unknown) {
      console.error("Error deleting unit:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus satuan"));
    }
  };

  const handleConfirmToggleStatus = async () => {
    const unit = statusDialog.unit;
    if (!unit) return;
    if (statusMutation.isPending) return;

    try {
      await statusMutation.mutateAsync({ id: unit.id, isActive: statusDialog.nextStatus });
      toast.success(`Satuan berhasil ${statusDialog.nextStatus ? "diaktifkan" : "dinonaktifkan"}`);
      setStatusDialog({ open: false, unit: null, nextStatus: true });
    } catch (error: unknown) {
      console.error("Error updating unit status:", error);
      toast.error(getErrorMessage(error, "Gagal mengubah status satuan"));
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
      <FormModal
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingUnit ? "Edit Satuan" : "Tambah Satuan"}
        description={
          editingUnit
            ? "Ubah data satuan yang sudah ada"
            : "Tambahkan satuan baru untuk bahan baku"
        }
        onSubmit={handleSubmit}
        loading={isSubmitting}
      >
        <div>
          <FormFieldLabel htmlFor="kode" required>
            Kode Satuan
          </FormFieldLabel>
          <Input
            id="kode"
            value={formData.kode}
            onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
            placeholder="Contoh: KG"
            maxLength={10}
            required
            className={formInputClassName}
          />
        </div>
        <div>
          <FormFieldLabel htmlFor="nama" required>
            Nama Satuan
          </FormFieldLabel>
          <Input
            id="nama"
            value={formData.nama}
            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            placeholder="Contoh: Kilogram"
            maxLength={50}
            required
            className={formInputClassName}
          />
        </div>
        <div>
          <FormFieldLabel htmlFor="tipe" required>
            Tipe Satuan
          </FormFieldLabel>
          <Combobox
            options={TIPE_OPTIONS}
            value={formData.tipe}
            onChange={(value) =>
              setFormData({ ...formData, tipe: value as "BESAR" | "KECIL" | "KONVERSI" })
            }
            placeholder="Pilih tipe satuan..."
            searchPlaceholder="Cari tipe satuan..."
            emptyMessage="Tipe satuan tidak ditemukan"
            className={formComboboxClassName}
          />
        </div>
        <div>
          <FormFieldLabel htmlFor="deskripsi">Deskripsi</FormFieldLabel>
          <Textarea
            id="deskripsi"
            value={formData.deskripsi}
            onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
            placeholder="Deskripsi opsional"
            rows={3}
            className="min-h-24 resize-none bg-white text-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          />
        </div>
      </FormModal>

      {/* Status Confirmation Dialog */}
      <ConfirmDialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open && !statusUpdatingId) {
            setStatusDialog({ open: false, unit: null, nextStatus: true });
          }
        }}
        variant="default"
        title={statusDialog.nextStatus ? "Aktifkan Satuan?" : "Nonaktifkan Satuan?"}
        description={`Apakah Anda yakin ingin ${
          statusDialog.nextStatus ? "mengaktifkan" : "menonaktifkan"
        } satuan "${statusDialog.unit?.nama ?? ""}"?`}
        confirmLabel={statusDialog.nextStatus ? "Aktifkan" : "Nonaktifkan"}
        loading={Boolean(statusUpdatingId)}
        onConfirm={handleConfirmToggleStatus}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Hapus Satuan?"
        description={`Apakah Anda yakin ingin menghapus satuan "${
          deletingUnit?.nama ?? ""
        }"? Data akan disembunyikan dari daftar. Satuan yang sudah digunakan di bahan baku tidak bisa dihapus.`}
        confirmLabel="Hapus"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
