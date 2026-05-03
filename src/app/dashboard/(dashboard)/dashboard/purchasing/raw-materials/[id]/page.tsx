"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Package, AlertCircle, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RawMaterialWithStock } from "@/types/purchasing";
import { getRawMaterial, deleteRawMaterial } from "@/lib/purchasing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function RawMaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;

  const [material, setMaterial] = useState<RawMaterialWithStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (materialId) {
      loadData();
    }
  }, [materialId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getRawMaterial(materialId);
      setMaterial(data);
    } catch (error) {
      console.error("Error loading material:", error);
      toast.error("Gagal memuat data bahan baku");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!material) return;
    try {
      await deleteRawMaterial(material.id);
      toast.success("Bahan baku berhasil dinonaktifkan");
      setIsDeleteDialogOpen(false);
      router.push("/dashboard/purchasing/raw-materials");
    } catch (error: any) {
      console.error("Error deleting material:", error);
      toast.error(error.message || "Gagal menghapus bahan baku");
    }
  };

  const formatCurrency = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "Rp 0";
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString("id-ID", { maximumFractionDigits: 4 });
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "AMAN":
        return <Badge className="bg-green-100 text-green-800">Aman</Badge>;
      case "MENIPIS":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            Menipis
          </Badge>
        );
      case "HABIS":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1 inline" />
            Habis
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data...</div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-red-500">Bahan baku tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/raw-materials">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{material.nama}</h1>
              {getStockStatusBadge(material.status_stok)}
            </div>
            <p className="text-muted-foreground">{material.kode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/purchasing/raw-materials/${material.id}/edit`}>
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

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">Informasi</TabsTrigger>
          <TabsTrigger value="stock">Stok & Harga</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Material Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Informasi Bahan Baku
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Kode</p>
                    <p className="font-medium">{material.kode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kategori</p>
                    <p className="font-medium">
                      {material.kategori.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deskripsi</p>
                  <p>{material.deskripsi || "-"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Satuan Besar</p>
                    <p className="font-medium">{material.satuan_besar_nama || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Satuan Kecil</p>
                    <p className="font-medium">{material.satuan_kecil_nama || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Konversi</p>
                    <p className="font-medium">{material.konversi_factor || 1} {material.satuan_kecil_nama} = 1 {material.satuan_besar_nama}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Storage</p>
                    <p className="font-medium">
                      {material.storage_condition ? material.storage_condition.replace(/_/g, " ") : "-"}
                    </p>
                  </div>
                </div>
                {material.shelf_life_days && (
                  <div>
                    <p className="text-sm text-muted-foreground">Shelf Life</p>
                    <p className="font-medium">{material.shelf_life_days} hari</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum</span>
                  <span className="font-medium">{formatNumber(material.stok_minimum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum</span>
                  <span className="font-medium">{formatNumber(material.stok_maximum)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock & Price Tab */}
        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Stok Real-time & Harga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Qty Onhand</p>
                  <p className="text-2xl font-bold">{formatNumber(material.qty_onhand)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qty Reserved</p>
                  <p className="text-2xl font-bold">{formatNumber(material.qty_reserved)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Qty On Order</p>
                  <p className="text-2xl font-bold">{formatNumber(material.qty_on_order)}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Cost</span>
                  <span className="text-xl font-semibold">{formatCurrency(material.avg_cost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menonaktifkan bahan baku &quot;{material.nama}&quot;?
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
