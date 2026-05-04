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
import { Plus, Search, MoreVertical, DollarSign, Edit, Trash2 } from "lucide-react";
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

export default function PriceListPage() {
  const [priceLists, setPriceLists] = useState<SupplierPriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<SupplierPriceList | null>(null);

  useEffect(() => {
    loadPriceLists();
  }, [filterSupplier, filterMaterial]);

  const loadPriceLists = async () => {
    try {
      setLoading(true);
      const response = await listPriceLists({
        supplier_id: filterSupplier || undefined,
        raw_material_id: filterMaterial || undefined,
      });
      setPriceLists(response);
    } catch (error) {
      console.error("Error loading price lists:", error);
      toast.error("Gagal memuat data price list");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDelete = (item: SupplierPriceList) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await deletePriceList(deletingItem.id);
      toast.success("Price list berhasil dihapus");
      setIsDeleteDialogOpen(false);
      loadPriceLists();
    } catch (error: any) {
      console.error("Error deleting price list:", error);
      toast.error(error.message || "Gagal menghapus price list");
    }
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Supplier Price List</h1>
          <p className="text-muted-foreground">
            Daftar harga bahan baku per supplier
          </p>
        </div>
        <Link href="/dashboard/purchasing/price-list/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Price List
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari supplier..."
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari bahan baku..."
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Bahan Baku</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-right">MOQ</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : priceLists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Belum ada price list
                </TableCell>
              </TableRow>
            ) : (
              priceLists.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{item.supplier?.nama_supplier}</div>
                    <div className="text-sm text-muted-foreground">{item.supplier?.kode}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{item.bahan_baku?.nama}</div>
                    <div className="text-sm text-muted-foreground">{item.bahan_baku?.kode}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      {formatCurrency(item.harga)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      per {item.satuan?.nama || "unit"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {item.minimum_qty} {item.satuan?.nama}
                  </TableCell>
                  <TableCell>{item.lead_time_days} hari</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(item.berlaku_dari)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      s/d {formatDate(item.berlaku_sampai)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative z-10">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50 bg-white shadow-lg border border-gray-200">
                        <Link href={`/dashboard/purchasing/price-list/${item.id}`}>
                          <DropdownMenuItem>
                            <DollarSign className="w-4 h-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/dashboard/purchasing/price-list/${item.id}/edit`}>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          onClick={() => handleOpenDelete(item)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
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

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus price list ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
