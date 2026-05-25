"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, DollarSign, Package, Truck, CalendarDays, Star } from "lucide-react";
import { toast } from "sonner";
import { SupplierPriceList } from "@/types/purchasing";
import { deletePriceList, getPriceList } from "@/lib/purchasing";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
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

  const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const item = await getPriceList(priceListId);
      setPriceList(item);
    } catch (error) {
      console.error("Error loading price list:", error);
      toast.error("Gagal memuat data price list");
    } finally {
      setLoading(false);
    }
  }, [priceListId]);

  useEffect(() => {
    if (priceListId) {
      loadData();
    }
  }, [priceListId, loadData]);

  const handleDelete = async () => {
    if (!priceList) return;
    try {
      await deletePriceList(priceList.id);
      toast.success("Price list berhasil dihapus");
      setIsDeleteDialogOpen(false);
      router.push("/dashboard/purchasing/price-list");
    } catch (error: unknown) {
      console.error("Error deleting price list:", error);
      toast.error(getErrorMessage(error, "Gagal menghapus price list"));
    }
  };

  const formatCurrency = (num?: number | null) => {
    return `Rp ${(num || 0).toLocaleString("id-ID")}`;
  };

  const formatNumber = (num?: number | null) => {
    return (num || 0).toLocaleString("id-ID", { maximumFractionDigits: 4 });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const unitName = priceList?.satuan?.nama || "unit";
  const supplierCode = priceList?.supplier?.kode_supplier || priceList?.supplier?.kode || "-";

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
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Master Data", href: "/dashboard/purchasing/main" },
          { label: "Daftar Harga", href: "/dashboard/purchasing/price-list" },
          { label: priceList.supplier?.nama_supplier || "Detail Harga" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{priceList.supplier?.nama_supplier}</h1>
            {priceList.is_preferred && (
              <Badge className="bg-blue-100 text-blue-800">Preferred</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{priceList.bahan_baku?.nama || "-"}</span>
            <span className="text-gray-300">•</span>
            <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">{priceList.bahan_baku?.kode || "-"}</span>
            <span className="text-gray-300">•</span>
            <span>{formatCurrency(priceList.harga || 0)}</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/dashboard/purchasing/price-list">
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <Link href={`/dashboard/purchasing/price-list/${priceList.id}/edit`}>
            <Button variant="outline" className="purchasing-secondary-button w-full sm:w-auto">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(true)} className="h-10 w-full rounded-lg border-red-200 bg-white px-3 text-sm font-medium text-red-600 shadow-sm hover:!border-red-200 hover:!bg-red-50 hover:!text-red-700 sm:w-auto">
            <Trash2 className="w-4 h-4 mr-2" />
            Hapus
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                <DollarSign className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Harga per Satuan</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(priceList.harga)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Package className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Minimum Qty</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(priceList.minimum_qty)} {unitName}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Lead Time</p>
                <p className="text-lg font-bold text-gray-900">{formatNumber(priceList.lead_time_days)} hari</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Star className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-gray-500">Status Supplier</p>
                <p className="text-lg font-bold text-gray-900">{priceList.is_preferred ? "Preferred" : "Regular"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pricing Info */}
        <Card className="border-gray-200/70 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-5 h-5" />
              Informasi Harga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-semibold text-gray-900">{priceList.supplier?.nama_supplier || "-"}</p>
                <p className="text-sm text-gray-500">{supplierCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bahan Baku</p>
                <p className="font-semibold text-gray-900">{priceList.bahan_baku?.nama || "-"}</p>
                <p className="text-sm text-gray-500">{priceList.bahan_baku?.kode || "-"}</p>
              </div>
            </div>
            <div className="border-t border-gray-200/70 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-gray-500">Harga per Satuan</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(priceList.harga)}</span>
              </div>
              <p className="text-sm text-gray-500">
                per {unitName}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-gray-200/70 pt-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Minimum Qty</p>
                  <p className="font-semibold text-gray-900">{formatNumber(priceList.minimum_qty)} {unitName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Lead Time</p>
                  <p className="font-semibold text-gray-900">{formatNumber(priceList.lead_time_days)} hari</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validity Period */}
        <Card className="border-gray-200/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5" />
              Periode Berlaku
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Berlaku Dari</p>
              <p className="font-semibold text-gray-900">{formatDate(priceList.berlaku_dari)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Berlaku Sampai</p>
              <p className="font-semibold text-gray-900">{formatDate(priceList.berlaku_sampai)}</p>
            </div>
            {priceList.catatan && (
              <div className="border-t border-gray-200/70 pt-4">
                <p className="mb-2 text-sm text-gray-500">Catatan</p>
                <p className="text-sm text-gray-700">{priceList.catatan}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="border-gray-200/70">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus price list ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200/70 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="purchasing-secondary-button">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="h-10 rounded-lg px-5">
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
