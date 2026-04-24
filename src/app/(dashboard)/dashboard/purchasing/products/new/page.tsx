"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Plus, Trash2, Package, Calculator } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { ProductFormData, RawMaterialWithStock, Unit, BOMItemFormData } from "@/types/purchasing";
import { listRawMaterials, listUnits, createProduct, createBOMItem } from "@/lib/purchasing";

interface BOMFormItem extends Partial<BOMItemFormData> {
  id: string;
  raw_material_name?: string;
  raw_material_unit?: string;
  subtotal: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
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

  const [bomItems, setBomItems] = useState<BOMFormItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materialsData, unitsData] = await Promise.all([
        listRawMaterials({ limit: 100 }),
        listUnits(),
      ]);
      setMaterials(materialsData.data);
      setUnits(unitsData.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const addBOMItem = () => {
    setBomItems([
      ...bomItems,
      {
        id: crypto.randomUUID(),
        raw_material_id: "",
        qty_needed: 0,
        waste_persen: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeBOMItem = (id: string) => {
    setBomItems(bomItems.filter((item) => item.id !== id));
  };

  const updateBOMItem = (id: string, updates: Partial<BOMFormItem>) => {
    setBomItems(
      bomItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          const material = materials.find((m) => m.id === updated.raw_material_id);
          const qty = updated.qty_needed || 0;
          const waste = updated.waste_persen || 0;
          const price = material?.harga_avg || 0;
          updated.subtotal = price * qty * (1 + waste / 100);
          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotalCost = () => {
    return bomItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nama) {
      toast.error("Nama produk wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const productData = {
        ...formData,
        harga_modal: calculateTotalCost(),
      };
      const product = await createProduct(productData);

      for (const item of bomItems) {
        if (item.raw_material_id) {
          await createBOMItem(product.id, {
            raw_material_id: item.raw_material_id,
            qty_needed: item.qty_needed || 0,
            waste_persen: item.waste_persen || 0,
          });
        }
      }

      toast.success("Produk berhasil ditambahkan");
      router.push("/dashboard/purchasing/products");
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast.error(error.message || "Gagal menambahkan produk");
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
        <Link href="/dashboard/purchasing/products">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Produk Baru</h1>
          <p className="text-sm text-gray-500">Isi detail produk dan BOM</p>
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
                    placeholder="Contoh: Roti Coklat Lumer"
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
                  placeholder="Deskripsi produk..."
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
                    placeholder="Harga jual ke customer"
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
              <Button type="button" size="sm" variant="outline" onClick={addBOMItem} className="h-8 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Tambah Bahan
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {bomItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Belum ada bahan baku. Klik "Tambah Bahan" untuk menambahkan.
                </div>
              ) : (
                <div className="space-y-3">
                  {bomItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-end p-3 border rounded-md bg-gray-50">
                      <div className="col-span-4 space-y-1.5">
                        <Label className="text-xs">Bahan Baku</Label>
                        <Combobox
                          options={materials.map((m) => ({ value: m.id, label: m.nama, description: m.kode }))}
                          value={item.raw_material_id}
                          onChange={(v) => updateBOMItem(item.id, { raw_material_id: v })}
                          placeholder="Pilih bahan..."
                          searchPlaceholder="Cari..."
                          emptyMessage="Tidak ada bahan"
                          allowClear
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.qty_needed}
                          onChange={(e) => updateBOMItem(item.id, { qty_needed: parseFloat(e.target.value) || 0 })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Waste (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={item.waste_persen}
                          onChange={(e) => updateBOMItem(item.id, { waste_persen: parseFloat(e.target.value) || 0 })}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="col-span-3 space-y-1.5">
                        <Label className="text-xs">Subtotal</Label>
                        <Input
                          type="number"
                          value={item.subtotal}
                          disabled
                          className="h-9 text-sm bg-gray-100 font-mono"
                        />
                      </div>
                      <div className="col-span-1 space-y-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBOMItem(item.id)}
                          className="h-9 w-9 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
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
            {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
          </Button>
        </div>
      </form>
    </div>
  );
}
