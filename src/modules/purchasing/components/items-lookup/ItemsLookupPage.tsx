"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormFieldLabel, formInputClassName } from "@/components/layout/form-field";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ItemsLookupRecord, ItemsLookupType } from "@/lib/purchasing/items-lookup";
import { ITEMS_LOOKUP_CONFIG } from "@/lib/purchasing/items-lookup";
import { useItemsLookupList } from "@/features/purchasing/items/queries";
import { useSaveItemsLookup, useDeleteItemsLookup } from "@/features/purchasing/items/mutations";

interface ItemsLookupPageProps {
  lookupType: ItemsLookupType;
  breadcrumbs?: { label: string; href?: string }[];
}

const EMPTY_FORM = {
  code: "",
  nama: "",
  deskripsi: "",
  is_active: true,
};

export function ItemsLookupPage({ lookupType, breadcrumbs = [] }: ItemsLookupPageProps) {
  const config = ITEMS_LOOKUP_CONFIG[lookupType];

  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ItemsLookupRecord | null>(null);
  const [deleting, setDeleting] = useState<ItemsLookupRecord | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const listQuery = useItemsLookupList(lookupType, search);
  const records = listQuery.data ?? [];
  const loading = listQuery.isLoading;

  const saveMutation = useSaveItemsLookup(lookupType);
  const deleteMutation = useDeleteItemsLookup(lookupType);
  const isSubmitting = saveMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (listQuery.isError) {
      toast.error(listQuery.error instanceof Error ? listQuery.error.message : "Gagal memuat data");
    }
  }, [listQuery.isError, listQuery.error]);

  const handleSearch = () => setSearch(searchQuery.trim());

  const handleOpenAdd = () => {
    setEditing(null);
    setFormData(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (record: ItemsLookupRecord) => {
    setEditing(record);
    setFormData({
      code: record.code,
      nama: record.nama,
      deskripsi: record.deskripsi || "",
      is_active: record.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      const json = await saveMutation.mutateAsync({ payload: formData, id: editing?.id });
      toast.success(json.message || "Berhasil disimpan");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const json = await deleteMutation.mutateAsync(deleting.id);
      toast.success(json.message || "Berhasil dihapus");
      setIsDeleteDialogOpen(false);
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus");
    }
  };

  return (
    <div className="space-y-6">
      {breadcrumbs.length > 0 ? <BreadcrumbNav items={breadcrumbs} /> : null}

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{config.description}</p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Cari kode atau nama..."
              className="h-10 pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} className="h-10 border-gray-200/80">
            Cari
          </Button>
        </div>

        <div className="overflow-x-auto px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200/70 text-left text-gray-500">
                <th className="px-4 py-3 font-semibold">Kode</th>
                <th className="px-4 py-3 font-semibold">Nama</th>
                <th className="px-4 py-3 font-semibold">Deskripsi</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="border-b border-gray-200/70 hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{record.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{record.nama}</td>
                    <td className="px-4 py-3 text-gray-600">{record.deskripsi || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge className={record.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                        {record.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(record)}
                          className="h-8 border-gray-200/80"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleting(record);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="h-8 border-red-200/80 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <FormModal
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editing ? `Edit ${config.title}` : `Tambah ${config.title}`}
        description={editing ? "Ubah data yang sudah ada" : "Lengkapi informasi di bawah ini"}
        onSubmit={handleSubmit}
        loading={isSubmitting}
        submitDisabled={!formData.code || !formData.nama}
      >
        <div>
          <FormFieldLabel htmlFor="code" required>
            Kode
          </FormFieldLabel>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="CONTOH_KODE"
            maxLength={30}
            required
            className={formInputClassName}
          />
        </div>
        <div>
          <FormFieldLabel htmlFor="nama" required>
            Nama
          </FormFieldLabel>
          <Input
            id="nama"
            value={formData.nama}
            onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
            placeholder="Nama"
            maxLength={100}
            required
            className={formInputClassName}
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
        <div className="flex items-center justify-between rounded-lg border border-gray-200/70 px-3 py-2.5">
          <FormFieldLabel htmlFor="is_active" className="mb-0">
            Status aktif
          </FormFieldLabel>
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
        </div>
      </FormModal>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Hapus data?"
        description={`"${deleting?.nama ?? ""}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        loading={isSubmitting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
