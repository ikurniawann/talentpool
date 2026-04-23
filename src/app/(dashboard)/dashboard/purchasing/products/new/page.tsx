"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Plus, Trash2, Package, Calculator } from "lucide-react";
import { toast } from "sonner";
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
        listUnits(true),
      ]);
      setMaterials(materialsData.data);
      setUnits(unitsData);
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

  const removeBOMItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const updateBOMItem = (index: number, field: keyof BOMFormItem, value: any) => {
    const newItems = [...bomItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate subtotal when qty or waste changes
    if (field === "qty_needed" || field === "waste_persen") {
      const qty = field === "qty_needed" ? value : newItems[index].qty_needed;
      const waste = field === "waste_persen" ? value : newItems[index].waste_persen;
      const material = materials.find((m) => m.id === newItems[index].raw_material_id);
      if (material) {
        const effectiveQty = qty * (1 + (waste || 0) / 100);
        newItems[index].subtotal = effectiveQty * (material.harga_satuan || 0);
      }
    }

    // Update material info
    if (field === "raw_material_id") {
      const material = materials.find((m) => m.id === value);
      newItems[index].raw_material_name = material?.nama;
      newItems[index].raw_material_unit = material?.satuan_besar_nama;
      newItems[index].satuan_id = material?.satuan_besar_id;
      // Recalculate with new material price
      const qty = newItems[index].qty_needed || 0;
      const waste = newItems[index].waste_persen || 0;
      const effectiveQty = qty * (1 + waste / 100);
      newItems[index].subtotal = effectiveQty * (material?.harga_satuan || 0);
    }

    setBomItems(newItems);
  };

  const calculateHPP = () => {
    return bomItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  const calculateSuggestedPrice = () => {
    const hpp = calculateHPP();
    if (!hpp || !formData.markup_persen) return 0;
    return hpp * (1 + formData.markup_persen / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) {
      toast.error("Nama produk wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create product
      const product = await createProduct(formData);

      // Create BOM items
      for (const item of bomItems) {
        if (item.raw_material_id && item.qty_needed) {
          await createBOMItem(product.id, {
            raw_material_id: item.raw_material_id,
            qty_needed: item.qty_needed,
            satuan_id: item.satuan_id,
            waste_persen: item.waste_persen || 0,
            catatan: item.catatan,
          });
        }
      }

      toast.success("Produk berhasil dibuat");
      router.push(`/dashboard/purchasing/products/${product.id}`);
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast.error(error.message || "Gagal membuat produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const hpp = calculateHPP();
  const suggestedPrice = calculateSuggestedPrice();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Tambah Produk Baru</h1>
          <p className="text-muted-foreground">
            Buat produk jadi dengan BOM komposisi
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="space-y-2">
                  <Label>
                    Nama Produk <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.nama}
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                    placeholder="Contoh: Kue Kering Coklat"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Input
                    value={formData.kategori}
                    onChange={(e) =>
                      setFormData({ ...formData, kategori: e.target.value })
                    }
                    placeholder="Contoh: Kue, Roti, Snack"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Deskripsi produk..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Harga Jual</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.harga_jual}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        harga_jual: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Markup (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.markup_persen}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        markup_persen: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.is_active ? "active" : "inactive"}
                    onValueChange={(v) =>
                      setFormData({ ...formData, is_active: v === "active" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="inactive">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Perhitungan Harga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">HPP (dari BOM)</span>
                <span className="font-medium">{formatCurrency(hpp)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Harga Jual</span>
                <span className="font-medium">{formatCurrency(formData.harga_jual)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Margin</span>
                <span
                  className={`font-medium ${
                    formData.harga_jual > hpp ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(formData.harga_jual - hpp)} (
                  {hpp ? (((formData.harga_jual - hpp) / hpp) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              {suggestedPrice > 0 && (
                <div className="border-t pt-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    Harga Jual yang Disarankan ({formData.markup_persen}% markup)
                  </div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(suggestedPrice)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* BOM Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bill of Materials (BOM)</CardTitle>
            <Button type="button" onClick={addBOMItem} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Bahan
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bomItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg"
                >
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Bahan Baku *</Label>
                    <Select
                      value={item.raw_material_id || ""}
                      onValueChange={(v) => updateBOMItem(index, "raw_material_id", v)}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bahan baku" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nama} - {m.kode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Jumlah *</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={item.qty_needed}
                      onChange={(e) =>
                        updateBOMItem(index, "qty_needed", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Satuan</Label>
                    <Select
                      value={item.satuan_id || ""}
                      onValueChange={(v) => updateBOMItem(index, "satuan_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Satuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Waste (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.waste_persen}
                      onChange={(e) =>
                        updateBOMItem(index, "waste_persen", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Subtotal</Label>
                    <div className="text-sm font-medium py-2">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBOMItem(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {bomItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  Belum ada bahan baku. Klik "Tambah Bahan" untuk memulai.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/purchasing/products">
            <Button variant="outline" disabled={isSubmitting}>
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan Produk"}
          </Button>
        </div>
      </form>
    </div>
  );
}
