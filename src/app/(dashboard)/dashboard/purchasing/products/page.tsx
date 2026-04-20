"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Package, Calculator } from "lucide-react";
import { toast } from "sonner";
import { ProductWithCOGS, PaginatedResponse } from "@/types/purchasing";
import { listProducts, deleteProduct } from "@/lib/purchasing";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductWithCOGS | null>(null);

  useEffect(() => {
    loadProducts();
  }, [pagination.page]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await listProducts({
        search: searchQuery || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setProducts(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        total_pages: response.pagination.total_pages,
      }));
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = (product: ProductWithCOGS) => {
    setDeletingProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct.id);
      toast.success("Produk berhasil dinonaktifkan");
      setIsDeleteDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(error.message || "Gagal menghapus produk");
    }
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Master Produk</h1>
          <p className="text-muted-foreground">
            Kelola produk jadi dengan BOM (Bill of Materials)
          </p>
        </div>
        <Link href="/dashboard/purchasing/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Produk
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">HPP Estimasi</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Tidak ada data produk
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.kode}</TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/purchasing/products/${product.id}`}
                      className="hover:underline text-blue-600"
                    >
                      {product.nama}
                    </Link>
                  </TableCell>
                  <TableCell>{product.kategori || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Calculator className="w-3 h-3 text-muted-foreground" />
                      {formatCurrency(product.hpp_estimasi)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.harga_jual)}
                  </TableCell>
                  <TableCell>
                    {product.is_active ? (
                      <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/dashboard/purchasing/products/${product.id}`}>
                          <DropdownMenuItem>
                            <Package className="w-4 h-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/dashboard/purchasing/products/${product.id}/edit`}>
                          <DropdownMenuItem>Edit Produk</DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(product)}
                          className="text-red-600"
                        >
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                className={
                  pagination.page <= 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {Array.from(
              { length: Math.min(5, pagination.total_pages) },
              (_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: pageNum }))
                      }
                      isActive={pageNum === pagination.page}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(pagination.total_pages, prev.page + 1),
                  }))
                }
                className={
                  pagination.page >= pagination.total_pages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan produk &quot;{deletingProduct?.nama}
              &quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
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
