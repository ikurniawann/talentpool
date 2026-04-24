"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { Unit, UnitFormData } from "@/types/purchasing";
import {
  listUnits,
  createUnit,
  updateUnit,
  deleteUnit,
} from "@/lib/purchasing";
import {
  Pagination,
  PaginationProps,
} from "@/components/ui/pagination";

const TIPE_OPTIONS = [
  { value: "BESAR", label: "Satuan Besar" },
  { value: "KECIL", label: "Satuan Kecil" },
  { value: "KONVERSI", label: "Satuan Konversi" },
];

export default function UnitsPage() {
  const router = useRouter();
  const logger = useActivityLogger();
  
  // State
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  
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

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ───────────────────────────────────────────────────

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listUnits({
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setUnits(response.data);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.total_pages);
    } catch (error: any) {
      console.error("Error loading units:", error);
      toast.error("Gagal memuat data satuan");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, limit, toast]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
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
    setIsSubmitting(true);

    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, formData);
        toast.success("Satuan berhasil diupdate");
      } else {
        await createUnit(formData);
        toast.success("Satuan berhasil ditambahkan");
      }
      setIsDialogOpen(false);
      fetchUnits();
    } catch (error: any) {
      console.error("Error saving unit:", error);
      toast.error(error.message || "Gagal menyimpan satuan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUnit) return;

    try {
      await deleteUnit(deletingUnit.id);
      toast.success("Satuan berhasil dinonaktifkan");
      setIsDeleteDialogOpen(false);
      fetchUnits();
    } catch (error: any) {
      console.error("Error deleting unit:", error);
      toast.error(error.message || "Gagal menghapus satuan");
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setPage(1);
  };

  // ── Helpers ──────────────────────────────────────────────────

  const getTipeBadge = (tipe: string) => {
    switch (tipe) {
      case "BESAR":
        return <Badge className="bg-blue-100 text-blue-800">Satuan Besar</Badge>;
      case "KECIL":
        return <Badge className="bg-green-100 text-green-800">Satuan Kecil</Badge>;
      case "KONVERSI":
        return <Badge className="bg-purple-100 text-purple-800">Konversi</Badge>;
      default:
        return <Badge>{tipe}</Badge>;
    }
  };

  // ── Pagination ───────────────────────────────────────────────

  const paginationProps: PaginationProps = {
    currentPage: page,
    totalPages,
    totalItems: total,
    onPageChange: setPage,
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Master Satuan</h1>
          <p className="text-muted-foreground">
            Kelola satuan ukuran untuk bahan baku dan produk — {total} total
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Satuan
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau nama satuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {(searchQuery || page > 1) && (
          <Button variant="ghost" onClick={handleResetFilters}>
            Reset
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex justify-center items-center gap-2 text-muted-foreground">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memuat...
                  </div>
                </TableCell>
              </TableRow>
            ) : units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "Tidak ada satuan yang cocok dengan pencarian" : "Belum ada data satuan"}
                  </p>
                  {!searchQuery && (
                    <Button variant="link" onClick={handleOpenAdd} className="mt-2">
                      + Tambah Satuan
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.kode}</TableCell>
                  <TableCell>{unit.nama}</TableCell>
                  <TableCell>{getTipeBadge(unit.tipe)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {unit.deskripsi || "-"}
                  </TableCell>
                  <TableCell>
                    {unit.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(unit)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDelete(unit)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {!loading && units.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Menampilkan</span>
              <Select
                value={String(limit)}
                onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>dari {total} data</span>
            </div>
            <Pagination {...paginationProps} />
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? "Edit Satuan" : "Tambah Satuan"}
            </DialogTitle>
            <DialogDescription>
              {editingUnit
                ? "Ubah data satuan yang sudah ada"
                : "Tambahkan satuan baru untuk bahan baku"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kode">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipe">
                Tipe Satuan <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.tipe}
                onValueChange={(value: "BESAR" | "KECIL" | "KONVERSI") =>
                  setFormData({ ...formData, tipe: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe satuan" />
                </SelectTrigger>
                <SelectContent>
                  {TIPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deskripsi">Deskripsi</Label>
              <Input
                id="deskripsi"
                value={formData.deskripsi}
                onChange={(e) =>
                  setFormData({ ...formData, deskripsi: e.target.value })
                }
                placeholder="Deskripsi opsional"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan satuan &quot;{deletingUnit?.nama}
              &quot;? Satuan yang sudah digunakan di bahan baku tidak bisa dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Nonaktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
