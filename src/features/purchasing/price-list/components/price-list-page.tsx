"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PurchasingListSection } from "@/modules/purchasing/components/list/PurchasingListSection";
import { PurchasingTablePagination } from "@/modules/purchasing/components/pagination/PurchasingTablePagination";
import { DollarSign, Eye, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SupplierPriceList } from "@/types/purchasing";
import { usePriceLists } from "../queries";
import { useDeletePriceList } from "../mutations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function PriceListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<SupplierPriceList | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const listQuery = usePriceLists();
  const priceLists = listQuery.data ?? [];
  const loading = listQuery.isLoading;

  const deleteMutation = useDeletePriceList();
  const isDeleting = deleteMutation.isPending;

  useEffect(() => {
    if (listQuery.isError) {
      console.error("Error loading price lists:", listQuery.error);
      toast.error("Gagal memuat data price list");
    }
  }, [listQuery.isError, listQuery.error]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const handleOpenDelete = (item: SupplierPriceList) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    if (isDeleting) return;

    try {
      await deleteMutation.mutateAsync(deletingItem.id);
      toast.success("Price list berhasil dihapus");
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error: unknown) {
      console.error("Error deleting price list:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus price list"));
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSearch("");
    setPage(1);
  };

  const filteredPriceLists = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return priceLists;

    return priceLists.filter((item) => {
      const haystack = [
        item.supplier?.nama_supplier,
        item.supplier?.kode_supplier,
        item.supplier?.kode,
        item.bahan_baku?.nama,
        item.bahan_baku?.kode,
        item.raw_material?.nama,
        item.raw_material?.kode,
        item.satuan?.nama,
        item.unit?.nama,
        item.minimum_qty,
        item.lead_time_days,
        item.harga,
        item.price,
        item.berlaku_dari,
        item.effective_date,
        item.berlaku_sampai,
        item.expiry_date,
        item.catatan,
        item.notes,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [priceLists, search]);

  const paginatedPriceLists = useMemo(
    () => filteredPriceLists.slice((page - 1) * limit, page * limit),
    [filteredPriceLists, page]
  );

  const totalPages = Math.max(1, Math.ceil(filteredPriceLists.length / limit));

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Harga Supplier</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar harga bahan baku per supplier — {filteredPriceLists.length} total
          </p>
        </div>
        <Link href="/dashboard/purchasing/price-list/insert">
          <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Price List
          </Button>
        </Link>
      </div>

      <PurchasingListSection
        icon={DollarSign}
        title="Daftar Harga"
        description="Kelola harga supplier per bahan baku, MOQ, lead time, dan masa berlaku."
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:w-auto md:flex-row md:items-center">
            <label className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari supplier, bahan baku, kode, harga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 bg-white pl-10 pr-10 text-sm focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
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
            {(search || page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-10 flex-shrink-0 rounded-lg">
                Reset
              </Button>
            )}
          </div>
        }
      >
        <div>
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-600" />
              <p className="mt-2 text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : filteredPriceLists.length === 0 ? (
            <div className="py-14 text-center">
              <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">
                {search ? "Tidak ada price list yang cocok dengan pencarian" : "Belum ada price list"}
              </p>
              {!search && (
                <Link href="/dashboard/purchasing/price-list/insert">
                  <Button variant="outline" className="mt-4 h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">
                    Tambah Price List Pertama
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                      <th className="px-4 py-3 text-left font-semibold">Bahan Baku</th>
                      <th className="px-4 py-3 text-right font-semibold">Harga</th>
                      <th className="px-4 py-3 text-right font-semibold">MOQ</th>
                      <th className="px-4 py-3 text-left font-semibold">Lead Time</th>
                      <th className="px-4 py-3 text-left font-semibold">Validity</th>
                      <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                  {paginatedPriceLists.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.supplier?.nama_supplier || "-"}</div>
                        <div className="text-sm text-gray-500">
                          {item.supplier?.kode_supplier || item.supplier?.kode || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.bahan_baku?.nama || item.raw_material?.nama || "-"}</div>
                        <div className="text-sm text-gray-500">{item.bahan_baku?.kode || item.raw_material?.kode || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(item.harga || item.price || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          per {item.satuan?.nama || item.unit?.nama || "unit"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {item.minimum_qty} {item.satuan?.nama || item.unit?.nama}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.lead_time_days} hari</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {formatDate(item.berlaku_dari || item.effective_date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          s/d {formatDate(item.berlaku_sampai || item.expiry_date || undefined)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/purchasing/price-list/${item.id}`}>
                            <Button variant="ghost" size="sm" className="cursor-pointer">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/purchasing/price-list/edit/${item.id}`}>
                            <Button variant="ghost" size="sm" className="cursor-pointer">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="cursor-pointer text-red-500 hover:text-red-600"
                            onClick={() => handleOpenDelete(item)}
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
                totalItems={filteredPriceLists.length}
                pageSize={limit}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </PurchasingListSection>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">Hapus Price List</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin menghapus price list ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="purchasing-main-button">
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
