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
import { ArrowLeft, Package, Calculator, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductWithCOGS, BOMItem } from "@/types/purchasing";
import { getProduct, listBOMItems, deleteProduct } from "@/lib/purchasing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductWithCOGS | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (productId) {
      loadData();
    }
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productData, bomData] = await Promise.all([
        getProduct(productId),
        listBOM(productId),
      ]);
      setProduct(productData);
      setBomItems(bomData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    try {
      await deleteProduct(product.id);
      toast.success("Produk berhasil dinonaktifkan");
      setIsDeleteDialogOpen(false);
      router.push("/dashboard/purchasing/products");
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error(error.message || "Gagal menghapus produk");
    }
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const calculateMargin = () => {
    if (!product) return { amount: 0, percentage: 0 };
    const amount = product.harga_jual - product.hpp_estimasi;
    const percentage = product.hpp_estimasi > 0 
      ? (amount / product.hpp_estimasi) * 100 
      : 0;
    return { amount, percentage };
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-red-500">Produk tidak ditemukan</div>
      </div>
    );
  }

  const margin = calculateMargin();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/purchasing/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{product.nama}</h1>
              {product.is_active ? (
                <Badge className="bg-green-100 text-green-800">Aktif</Badge>
              ) : (
                <Badge variant="secondary">Nonaktif</Badge>
              )}
            </div>
            <p className="text-muted-foreground">{product.kode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/purchasing/products/${product.id}/edit`}>
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
          <TabsTrigger value="bom">BOM ({bomItems.length})</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Informasi Produk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Kode</p>
                    <p className="font-medium">{product.kode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kategori</p>
                    <p className="font-medium">{product.kategori || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deskripsi</p>
                  <p>{product.deskripsi || "-"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Harga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HPP Estimasi</span>
                  <span className="font-medium">{formatCurrency(product.hpp_estimasi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Harga Jual</span>
                  <span className="font-medium">{formatCurrency(product.harga_jual)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-muted-foreground">Margin</span>
                  <span className={`font-medium ${margin.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(margin.amount)} ({margin.percentage.toFixed(1)}%)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BOM Tab */}
        <TabsContent value="bom">
          <Card>
            <CardHeader>
              <CardTitle>Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent>
              {bomItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada komposisi BOM
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bahan Baku</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead className="text-right">Waste</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.raw_material?.nama}</div>
                          <div className="text-sm text-muted-foreground">{item.raw_material?.kode}</div>
                        </TableCell>
                        <TableCell className="text-right">{item.qty_needed}</TableCell>
                        <TableCell>{item.satuan?.nama || "-"}</TableCell>
                        <TableCell className="text-right">{item.waste_persen}%</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">
                        Total HPP
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(bomItems.reduce((sum, item) => sum + item.subtotal, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
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
              Apakah Anda yakin ingin menonaktifkan produk &quot;{product.nama}&quot;?
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
