"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Package,
  Calculator,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import {
  ProductFormData,
  ProductWithCOGS,
  BOMItem,
  RawMaterialWithStock,
  Unit,
} from "@/types/purchasing";
import {
  getProduct,
  updateProduct,
  listBOMItems,
  createBOMItem,
  updateBOMItem,
  deleteBOMItem,
  listRawMaterials,
  listUnits,
} from "@/lib/purchasing";

interface BOMFormItem extends Partial<BOMItem> {
  id: string;
  raw_material_name?: string;
  raw_material_unit?: string;
  subtotal: number;
  isNew?: boolean;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductWithCOGS | null>(null);
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingBOMItem, setDeletingBOMItem] = useState<BOMFormItem | null>(null);

  useEffect(() => {
    if (productId) {
      loadData();
    }
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productData, bomData, materialsData, unitsData] = await Promise.all([
        getProduct(productId),
        listBOMItems(productId),
        listRawMaterials({ limit: 100 }),
        listUnits(),
      ]);
      
      console.log("BOM Data:", bomData);
      
      setProduct(productData);
      setBomItems(
        bomData.map((item: any) => ({
          id: item.id,
          raw_material_id: item.raw_material_id,
          qty_required: item.qty_required,
          satuan_id: item.satuan_id,
          waste_factor: item.waste_factor,
          raw_material_name: item.raw_material?.nama,
          raw_material_unit: item.satuan?.nama || item.raw_material?.satuan_kecil_nama,
          subtotal: item.total_cost || item.subtotal || 0,
          isNew: false,
        }))
      );
      setMaterials(materialsData.data);
      setUnits(unitsData.data || []);

      // Populate form data
      setFormData({
        nama: productData.nama,
        kategori: productData.kategori || "",
        deskripsi: productData.deskripsi || "",
        harga_jual: productData.harga_jual,
        markup_persen: 30,
        is_active: productData.is_active,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data produk");
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
        qty_required: 0,
        waste_factor: 0,
        subtotal: 0,
        isNew: true,
      },
    ]);
  };

  const removeBOMItem = (index: number) => {
    const item = bomItems[index];
    if (!item.isNew && item.id) {
      setDeletingBOMItem(item);
    } else {
      setBomItems(bomItems.filter((_, i) => i !== index));
    }
  };

  const confirmDeleteBOMItem = async () => {
    if (!deletingBOMItem || !deletingBOMItem.id) return;
    try {
      await deleteBOMItem(deletingBOMItem.id);
      toast.success("Bahan berhasil dihapus dari BOM");
      setBomItems(bomItems.filter((item) => item.id !== deletingBOMItem.id));
      setIsDeleteDialogOpen(false);
      setDeletingBOMItem(null);
    } catch (error: any) {
      console.error("Error deleting BOM item:", error);
      toast.error(error.message || "Gagal menghapus bahan dari BOM");
    }
  };

  const updateBOMItemField = (index: number, field: keyof BOMFormItem, value: any) => {
    const newItems = [...bomItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Update material info
    if (field === "raw_material_id") {
      const material = materials.find((m) => m.id === value);
      newItems[index].raw_material_name = material?.nama;
      newItems[index].raw_material_unit = material?.satuan_kecil_nama || material?.satuan_besar_nama;
      newItems[index].satuan_id = material?.satuan_kecil_id || material?.satuan_besar_id;
      // Recalculate with new material price
      const qty = newItems[index].qty_required || 0;
      const waste = newItems[index].waste_factor || 0;
      const effectiveQty = qty * (1 + waste);
      newItems[index].subtotal = effectiveQty * (material?.unit_cost || 0);
    }

    // Recalculate subtotal when qty or waste changes
    if (field === "qty_required" || field === "waste_factor") {
      const qty = field === "qty_required" ? value : newItems[index].qty_required;
      const waste = field === "waste_factor" ? value : newItems[index].waste_factor;
      const material = materials.find((m) => m.id === newItems[index].raw_material_id);
      if (material) {
        const effectiveQty = qty * (1 + (waste || 0));
        newItems[index].subtotal = effectiveQty * (material.unit_cost || 0);
      }
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
      // Update product
      await updateProduct(productId, formData);

      // Process BOM items
      for (const item of bomItems) {
        if (item.raw_material_id && item.qty_required) {
          if (item.isNew) {
            // Create new BOM item
            await createBOMItem(productId, {
              raw_material_id: item.raw_material_id,
              qty_required: item.qty_required,
              satuan_id: item.satuan_id,
              waste_factor: item.waste_factor || 0,
            });
          } else if (item.id) {
            // Update existing BOM item
            await updateBOMItem(item.id, {
              qty_required: item.qty_required,
              satuan_id: item.satuan_id,
              waste_factor: item.waste_factor || 0,
            });
          }
        }
      }

      toast.success("Produk berhasil diupdate");
      router.push(`/dashboard/purchasing/products/${productId}`);
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast.error(error.message || "Gagal mengupdate produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const hpp = calculateHPP();
  const suggestedPrice = calculateSuggestedPrice();
  const margin = formData.harga_jual - hpp;
  const marginPercent = hpp > 0 ? (margin / hpp) * 100 : 0;

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/purchasing/products/${productId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Produk</h1>
          <p className="text-muted-foreground">
            {product?.kode} - {product?.nama}
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
                  <Label>Kode</Label>
                  <Input value={product?.kode || ""} disabled className="bg-gray-50" />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    margin >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(margin)} ({marginPercent.toFixed(1)}%)
                </span>
              </div>
              {suggestedPrice > 0 && (
                <div className="border-t pt-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    Harga Jual yang Disarankan (30% markup)
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
            {bomItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                Belum ada bahan baku. Klik "Tambah Bahan" untuk memulai.
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
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select
                          value={item.raw_material_id || ""}
                          onValueChange={(v) =>
                            updateBOMItemField(index, "raw_material_id", v)
                          }
                          disabled={loading}
                        >
                          <SelectTrigger className="w-[250px]">
                            <SelectValue>
                              {item.raw_material_id ? (
                                materials.find((m) => m.id === item.raw_material_id) ? (
                                  `${materials.find((m) => m.id === item.raw_material_id)?.nama} - ${materials.find((m) => m.id === item.raw_material_id)?.kode}`
                                ) : (
                                  "Memuat..."
                                )
                              ) : (
                                "Pilih bahan baku"
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.nama} - {m.kode}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={item.qty_required}
                          onChange={(e) =>
                            updateBOMItemField(
                              index,
                              "qty_required",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-[100px] ml-auto"
                        />
                      </TableCell>
                      <TableCell>{item.raw_material_unit || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1"
                          value={item.waste_factor}
                          onChange={(e) =>
                            updateBOMItemField(
                              index,
                              "waste_factor",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-[80px] ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.subtotal || 0)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeBOMItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/purchasing/products/${productId}`}>
            <Button variant="outline" disabled={isSubmitting}>
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>

      {/* Delete BOM Item Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deletingBOMItem?.raw_material_name}
              &quot; dari BOM produk ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={confirmDeleteBOMItem}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
