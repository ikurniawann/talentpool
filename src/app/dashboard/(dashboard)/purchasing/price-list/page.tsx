"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { DollarSign, Eye, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SupplierPriceList } from "@/types/purchasing";
import { listPriceLists, deletePriceList } from "@/lib/purchasing";
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

export default function PriceListPage() {
  const [priceLists, setPriceLists] = useState<SupplierPriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [materialQuery, setMaterialQuery] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<SupplierPriceList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPriceLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listPriceLists({
        supplier_id: filterSupplier || undefined,
        raw_material_id: filterMaterial || undefined,
      });
      const items = Array.isArray(response) ? response : [response];
      setPriceLists(items);
    } catch (error) {
      console.error("Error loading price lists:", error);
      toast.error("Gagal memuat data price list");
    } finally {
      setLoading(false);
    }
  }, [filterSupplier, filterMaterial]);

  useEffect(() => {
    loadPriceLists();
  }, [loadPriceLists]);

  const handleOpenDelete = (item: SupplierPriceList) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deletePriceList(deletingItem.id);
      toast.success("Price list berhasil dihapus");
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      loadPriceLists();
    } catch (error: unknown) {
      console.error("Error deleting price list:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus price list"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilterSupplier(supplierQuery.trim());
    setFilterMaterial(materialQuery.trim());
  };

  const handleResetFilters = () => {
    setSupplierQuery("");
    setMaterialQuery("");
    setFilterSupplier("");
    setFilterMaterial("");
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID");
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Master Data", href: "/dashboard/purchasing/main" },
          { label: "Daftar Harga" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Harga Supplier</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar harga bahan baku per supplier — {priceLists.length} total
          </p>
        </div>
        <Link href="/dashboard/purchasing/price-list/new">
          <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Price List
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari supplier..."
                value={supplierQuery}
                onChange={(e) => setSupplierQuery(e.target.value)}
                className="h-9 pl-10 pr-10 text-sm"
              />
              {supplierQuery && (
                <button
                  type="button"
                  onClick={() => setSupplierQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
                  aria-label="Hapus pencarian supplier"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari bahan baku..."
                value={materialQuery}
                onChange={(e) => setMaterialQuery(e.target.value)}
                className="h-9 pl-10 pr-10 text-sm"
              />
              {materialQuery && (
                <button
                  type="button"
                  onClick={() => setMaterialQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
                  aria-label="Hapus pencarian bahan baku"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="outline" className="h-9 flex-shrink-0">
              Cari
            </Button>
            {(filterSupplier || filterMaterial) && (
              <Button type="button" variant="outline" onClick={handleResetFilters} className="h-9 flex-shrink-0">
                Reset
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5" />
            Daftar Harga
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-600" />
              <p className="mt-2 text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : priceLists.length === 0 ? (
            <div className="py-14 text-center">
              <DollarSign className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">Belum ada price list</p>
              <Link href="/dashboard/purchasing/price-list/new">
                <Button variant="outline" className="mt-4 h-10 gap-2 rounded-lg border-pink-200 bg-white px-3 text-sm font-medium text-pink-700 shadow-sm hover:!border-pink-200 hover:!bg-pink-50 hover:!text-pink-700">
                  Tambah Price List Pertama
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-gray-900">Supplier</TableHead>
                    <TableHead className="text-gray-900">Bahan Baku</TableHead>
                    <TableHead className="text-right text-gray-900">Harga</TableHead>
                    <TableHead className="text-right text-gray-900">MOQ</TableHead>
                    <TableHead className="text-gray-900">Lead Time</TableHead>
                    <TableHead className="text-gray-900">Validity</TableHead>
                    <TableHead className="text-right text-gray-900">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceLists.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">{item.supplier?.nama_supplier || "-"}</div>
                        <div className="text-sm text-gray-500">
                          {item.supplier?.kode_supplier || item.supplier?.kode || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">{item.bahan_baku?.nama || item.raw_material?.nama || "-"}</div>
                        <div className="text-sm text-gray-500">{item.bahan_baku?.kode || item.raw_material?.kode || "-"}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(item.harga || item.price || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          per {item.satuan?.nama || item.unit?.nama || "unit"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {item.minimum_qty} {item.satuan?.nama || item.unit?.nama}
                      </TableCell>
                      <TableCell className="text-gray-700">{item.lead_time_days} hari</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700">
                          {formatDate(item.berlaku_dari || item.effective_date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          s/d {formatDate(item.berlaku_sampai || item.expiry_date || undefined)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/dashboard/purchasing/price-list/${item.id}`}>
                            <Button variant="ghost" size="sm" className="cursor-pointer">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/purchasing/price-list/${item.id}/edit`}>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
