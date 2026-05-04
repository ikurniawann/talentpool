"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, DollarSign, Package, Truck } from "lucide-react";
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

export default function PriceListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const priceListId = params.id as string;

  const [priceList, setPriceList] = useState<SupplierPriceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (priceListId) {
      loadData();
    }
  }, [priceListId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await listPriceLists({});
      const item = response.find(p => p.id === priceListId);
      setPriceList(item || null);
    } catch (error) {
      console.error("Error loading price list:", error);
      toast.error("Gagal memuat data price list");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!priceList) return;
    try {
      await deletePriceList(priceList.id);
      toast.success("Price list berhasil dihapus");
      setIsDeleteDialogOpen(false);
      router.push("/dashboard/purchasing/price-list");
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
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data...</div>
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-red-500">Price list tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/price-list">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{priceList.supplier?.nama_supplier}</h1>
              {priceList.is_preferred && (
                <Badge className="bg-blue-100 text-blue-800">Preferred</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {priceList.bahan_baku?.nama} - {priceList.bahan_baku?.kode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/purchasing/price-list/${priceList.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pricing Info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{priceList.supplier?.nama_supplier}</p>
                <p className="text-sm text-muted-foreground">{priceList.supplier?.kode}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bahan Baku</p>
                <p className="font-medium">{priceList.bahan_baku?.nama}</p>
                <p className="text-sm text-muted-foreground">{priceList.bahan_baku?.kode}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground">Harga per Unit</span>
                <span className="text-2xl font-bold">{formatCurrency(priceList.harga)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                per {priceList.satuan?.nama || "unit"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">MOQ</p>
                  <p className="font-medium">{priceList.minimum_qty} {priceList.satuan?.nama}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Lead Time</p>
                  <p className="font-medium">{priceList.lead_time_days} hari</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Period */}
        <Card>
          <CardHeader>
            <CardTitle>Validity Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Berlaku Dari</p>
              <p className="font-medium">{formatDate(priceList.berlaku_dari)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Berlaku Sampai</p>
              <p className="font-medium">{formatDate(priceList.berlaku_sampai)}</p>
            </div>
            {priceList.catatan && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Catatan</p>
                <p className="text-sm">{priceList.catatan}</p>
              </div>
            )}
          </CardContent>
        </Card>
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
