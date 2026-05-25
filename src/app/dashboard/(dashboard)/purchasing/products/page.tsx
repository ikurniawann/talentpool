"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { Calculator, Eye, Loader2, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { ProductWithCOGS } from "@/types/purchasing";
import { listProducts, deleteProduct, updateProductStatus } from "@/lib/purchasing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCOGS[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductWithCOGS | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    product: ProductWithCOGS | null;
    nextStatus: boolean;
  }>({
    open: false,
    product: null,
    nextStatus: true,
  });

  const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
  };

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listProducts({
        search: search || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setProducts(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
        total_pages: response.total_pages,
      }));
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.page, search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleOpenDelete = (product: ProductWithCOGS) => {
    setDeletingProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteProduct(deletingProduct.id);
      toast.success("Produk berhasil dihapus");
      setIsDeleteDialogOpen(false);
      setDeletingProduct(null);
      loadProducts();
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus produk"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    const product = statusDialog.product;
    if (!product) return;
    if (statusUpdatingId) return;

    setStatusUpdatingId(product.id);
    try {
      await updateProductStatus(product.id, statusDialog.nextStatus);
      toast.success(`Produk berhasil ${statusDialog.nextStatus ? "diaktifkan" : "dinonaktifkan"}`);
      setStatusDialog({ open: false, product: null, nextStatus: true });
      loadProducts();
    } catch (error: unknown) {
      console.error("Error updating product status:", error);
      toast.error(getErrorMessage(error, "Gagal mengubah status produk"));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery.trim());
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSearch("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Master Data", href: "/dashboard/purchasing/main" },
          { label: "Produk" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Master Produk</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola produk jadi dengan BOM (Bill of Materials) — {pagination.total} total
          </p>
        </div>
        <Link href="/dashboard/purchasing/products/new">
          <Button className="h-10 w-full gap-2 rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari kode atau nama produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-10 pr-10 text-sm"
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
              </div>
              <Button type="submit" variant="outline" className="h-9 flex-shrink-0">
                Cari
              </Button>
            </form>

            {(search || pagination.page > 1) && (
              <Button variant="outline" onClick={handleResetFilters} className="h-9 flex-shrink-0">
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-gray-200/70 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            Daftar Produk
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink-600" />
              <p className="mt-2 text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-14 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">
                {search ? "Tidak ada produk yang cocok dengan pencarian" : "Belum ada data produk"}
              </p>
              {!search && (
                <Link href="/dashboard/purchasing/products/new">
                  <Button variant="outline" className="mt-4">
                    Tambah Produk Pertama
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-gray-900">Kode</TableHead>
                      <TableHead className="text-gray-900">Nama Produk</TableHead>
                      <TableHead className="text-gray-900">Kategori</TableHead>
                      <TableHead className="text-right text-gray-900">HPP Estimasi</TableHead>
                      <TableHead className="text-right text-gray-900">Harga Jual</TableHead>
                      <TableHead className="text-center text-gray-900">Status</TableHead>
                      <TableHead className="text-right text-gray-900">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <span className="font-medium text-gray-900">
                            {product.kode_produk || product.kode || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/purchasing/products/${product.id}`}
                            className="font-medium text-pink-600 hover:underline"
                          >
                            {product.nama}
                          </Link>
                        </TableCell>
                        <TableCell className="text-gray-700">{product.kategori || "-"}</TableCell>
                        <TableCell className="text-right text-gray-700">
                          <div className="flex items-center justify-end gap-1">
                            <Calculator className="h-3 w-3 text-gray-400" />
                            {formatCurrency(product.hpp_estimasi || 0)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-gray-900">
                          {formatCurrency(product.harga_jual || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={product.is_active ?? true}
                              disabled={statusUpdatingId === product.id}
                              onCheckedChange={(checked) =>
                                setStatusDialog({ open: true, product, nextStatus: checked })
                              }
                              aria-label={`Ubah status ${product.nama}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/dashboard/purchasing/products/${product.id}`}>
                              <Button variant="ghost" size="sm" className="cursor-pointer">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/purchasing/products/${product.id}/edit`}>
                              <Button variant="ghost" size="sm" className="cursor-pointer">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/purchasing/products/${product.id}/bom`}>
                              <Button variant="ghost" size="sm" className="cursor-pointer">
                                <Calculator className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer text-red-500 hover:text-red-600"
                              onClick={() => handleOpenDelete(product)}
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

              <div className="border-t border-gray-200/70">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-500">
                    Halaman {pagination.page} dari {Math.max(1, pagination.total_pages)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.min(Math.max(1, pagination.total_pages), prev.page + 1),
                        }))
                      }
                      disabled={pagination.page >= Math.max(1, pagination.total_pages)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status Dialog */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open && !statusUpdatingId) {
            setStatusDialog({ open: false, product: null, nextStatus: true });
          }
        }}
      >
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border border-gray-200/70 p-0 shadow-xl ring-1 ring-gray-200/60 sm:max-w-[420px]">
          <DialogHeader className="border-b border-gray-200/70 px-4 py-3.5">
            <DialogTitle className="text-base font-semibold text-gray-900">
              {statusDialog.nextStatus ? "Aktifkan Produk" : "Nonaktifkan Produk"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin {statusDialog.nextStatus ? "mengaktifkan" : "menonaktifkan"} produk &quot;{statusDialog.product?.nama}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mx-0 mb-0 gap-2 border-t border-gray-200/70 bg-gray-50/60 px-5 py-4 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setStatusDialog({ open: false, product: null, nextStatus: true })}
              disabled={Boolean(statusUpdatingId)}
              className="purchasing-secondary-button"
            >
              Batal
            </Button>
            <Button onClick={handleConfirmToggleStatus} disabled={Boolean(statusUpdatingId)} className="purchasing-main-button">
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
            <DialogTitle className="text-base font-semibold text-gray-900">Hapus Produk</DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-gray-500">
              Apakah Anda yakin ingin menghapus produk &quot;{deletingProduct?.nama}
              &quot;? Data akan disembunyikan dari daftar, bukan sekadar dinonaktifkan.
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
