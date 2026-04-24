"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2, Package, Calculator, Edit } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { ProductFormData, ProductWithCOGS, BOMItem, RawMaterialWithStock, Unit } from "@/types/purchasing";
import { getProduct, updateProduct, listBOMItems, createBOMItem, updateBOMItem, deleteBOMItem, listRawMaterials, listUnits } from "@/lib/purchasing";

interface BOMFormItem extends Partial<BOMItem> {
  id: string;
  raw_material_name?: string;
  raw_material_unit?: string;
  subtotal: number;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductWithCOGS | null>(null);
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    nama: "",
    kategori: "",
    deskripsi: "",
    harga_jual: 0,
    markup_persen: 30,
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      const [productData, bomData, materialsData, unitsData] = await Promise.all([
        getProduct(productId),
        listBOMItems(productId),
        listRawMaterials({ limit: 100 }),
        listUnits(),
      ]);
      setProduct(productData);
      setBomItems(bomData);
      setMaterials(materialsData.data);
      setUnits(unitsData.data || []);
      setFormData({
        nama: productData.nama || "",
        kategori: productData.kategori || "",
        deskripsi: productData.deskripsi || "",
        harga_jual: productData.harga_jual || 0,
        markup_persen: productData.markup_persen || 30,
        is_active: productData.is_active ?? true,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data produk");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalCost = () => {
    return bomItems.reduce((sum, item) => {
      const material = materials.find(m => m.id === item.raw_material_id);
      const qty = item.qty_needed || 0;
      const waste = item.waste_persen || 0;
      const price = material?.harga_avg || 0;
      return sum + (price * qty * (1 + waste / 100));
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nama) {
      toast.error("Nama produk wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProduct(productId, {
        ...formData,
        harga_modal: calculateTotalCost(),
      });
      toast.success("Produk berhasil diupdate");
      router.push(`/dashboard/purchasing/products/${productId}`);
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast.error(error.message || "Gagal mengupdate produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-gray-500">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/purchasing/products/${productId}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Produk</h1>
          <p className="text-sm text-gray-500">Update detail produk dan BOM</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Full Column Layout */}
        <div className="space-y-6">
          
          {/* Card 1: Informasi Produk */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Informasi Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nama" className="text-xs">Nama Produk <span className="text-red-500">*</span></Label>
                  <Input
                    id="nama"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    required
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kategori" className="text-xs">Kategori <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={[
                      { value: "MAKANAN", label: "Makanan" },
                      { value: "MINUMAN", label: "Minuman" },
                      { value: "BAHAN_BAKU", label: "Bahan Baku" },
                      { value: "LAINNYA", label: "Lainnya" },
                    ]}
                    value={formData.kategori}
                    onChange={(v) => setFormData({ ...formData, kategori: v })}
                    placeholder="Pilih kategori..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ditemukan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deskripsi" className="text-xs">Deskripsi</Label>
                <Textarea
                  id="deskripsi"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Pricing & HPP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="harga_modal" className="text-xs">Harga Modal (HPP)</Label>
                  <Input
                    id="harga_modal"
                    type="number"
                    value={calculateTotalCost()}
                    disabled
                    className="h-9 text-sm bg-gray-50 font-mono"
                  />
                  <p className="text-xs text-gray-500">Dari BOM</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="markup" className="text-xs">Markup (%)</Label>
                  <Input
                    id="markup"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.markup_persen}
                    onChange={(e) => setFormData({ ...formData, markup_persen: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="harga_jual" className="text-xs">Harga Jual</Label>
                  <Input
                    id="harga_jual"
                    type="number"
                    value={formData.harga_jual}
                    onChange={(e) => setFormData({ ...formData, harga_jual: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Bill of Materials (BOM) */}
          <Card>
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Bill of Materials (BOM)
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {bomItems.length} bahan
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {bomItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Belum ada bahan baku dalam BOM
                </div>
              ) : (
                <div className="space-y-2">
                  {bomItems.map((item) => {
                    const material = materials.find(m => m.id === item.raw_material_id);
                    const subtotal = (material?.harga_avg || 0) * (item.qty_needed || 0) * (1 + (item.waste_persen || 0) / 100);
                    return (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-md bg-gray-50">
                        <div className="col-span-5">
                          <p className="text-sm font-medium">{material?.nama || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{material?.kode}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm">{item.qty_needed}</p>
                          <p className="text-xs text-gray-500">{material?.satuan_besar?.nama}</p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className="text-sm">{item.waste_persen}%</p>
                        </div>
                        <div className="col-span-3 text-right font-mono text-sm">
                          Rp {subtotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-end pt-3 border-t">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total HPP</p>
                      <p className="text-lg font-bold text-gray-900">Rp {calculateTotalCost().toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()} className="px-6">
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="px-6">
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
