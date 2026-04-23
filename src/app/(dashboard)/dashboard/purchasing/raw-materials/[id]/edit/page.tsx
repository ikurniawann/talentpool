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
import { ArrowLeft, Save, Package, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { RawMaterialWithStock, Unit, MaterialCategory } from "@/types/purchasing";
import { getRawMaterial, updateRawMaterial, listUnits } from "@/lib/purchasing";

const CATEGORY_OPTIONS: { value: MaterialCategory; label: string }[] = [
  { value: "BAHAN_PANGAN", label: "Bahan Pangan" },
  { value: "BAHAN_NON_PANGAN", label: "Bahan Non-Pangan" },
  { value: "KEMASAN", label: "Kemasan" },
  { value: "BAHAN_BAKAR", label: "Bahan Bakar" },
  { value: "LAINNYA", label: "Lainnya" },
];

const STORAGE_OPTIONS = [
  { value: "SUHU_RUANG", label: "Suhu Ruang" },
  { value: "DINGIN", label: "Dingin (Chiller)" },
  { value: "BEKU", label: "Beku (Freezer)" },
  { value: "KHUSUS", label: "Kondisi Khusus" },
];

export default function EditRawMaterialPage() {
  const router = useRouter();
  const params = useParams();
  const materialId = params.id as string;

  const [material, setMaterial] = useState<RawMaterialWithStock | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nama: "",
    kategori: "" as MaterialCategory,
    deskripsi: "",
    satuan_besar_id: "",
    satuan_kecil_id: "",
    konversi_factor: 1,
    stok_minimum: 0,
    stok_maximum: 0,
    shelf_life_days: undefined as number | undefined,
    storage_condition: undefined as string | undefined,
  });

  useEffect(() => {
    if (materialId) {
      loadData();
    }
  }, [materialId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [materialData, unitsData] = await Promise.all([
        getRawMaterial(materialId),
        listUnits(true),
      ]);
      
      console.log("Loaded material:", materialData);
      
      setMaterial(materialData);
      setUnits(unitsData);

      // Populate form data
      setFormData({
        nama: materialData.nama,
        kategori: materialData.kategori,
        deskripsi: materialData.deskripsi || "",
        satuan_besar_id: materialData.satuan_besar_id || "",
        satuan_kecil_id: materialData.satuan_kecil_id || "",
        konversi_factor: materialData.konversi_factor || 1,
        stok_minimum: materialData.stok_minimum || 0,
        stok_maximum: materialData.stok_maximum || 0,
        shelf_life_days: materialData.shelf_life_days || undefined,
        storage_condition: materialData.storage_condition || undefined,
      });
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data bahan baku");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nama) {
      toast.error("Nama bahan baku wajib diisi");
      return;
    }
    if (!formData.satuan_besar_id) {
      toast.error("Satuan besar wajib dipilih");
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToSubmit = {
        ...formData,
        satuan_kecil_id: formData.satuan_kecil_id || undefined,
        shelf_life_days: formData.shelf_life_days || undefined,
        storage_condition: formData.storage_condition || undefined,
      };

      await updateRawMaterial(materialId, dataToSubmit);
      toast.success("Bahan baku berhasil diupdate");
      router.push(`/dashboard/purchasing/raw-materials/${materialId}`);
    } catch (error: any) {
      console.error("Error updating material:", error);
      toast.error(error.message || "Gagal mengupdate bahan baku");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Link href={`/dashboard/purchasing/raw-materials/${materialId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Bahan Baku</h1>
          <p className="text-muted-foreground">
            {material?.kode} - {material?.nama}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informasi Dasar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kode</Label>
                  <Input value={material?.kode || ""} disabled className="bg-gray-50" />
                  <p className="text-xs text-muted-foreground">Kode tidak dapat diubah</p>
                </div>
                <div className="space-y-2">
                  <Label>
                    Nama Bahan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.nama}
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                    placeholder="Contoh: Tepung Terigu"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    value={formData.kategori}
                    onValueChange={(v: MaterialCategory) =>
                      setFormData({ ...formData, kategori: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={formData.deskripsi}
                    onChange={(e) =>
                      setFormData({ ...formData, deskripsi: e.target.value })
                    }
                    placeholder="Deskripsi tambahan..."
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pengaturan Satuan */}
          <Card>
            <CardHeader>
              <CardTitle>Satuan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Satuan Besar <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.satuan_besar_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, satuan_besar_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih satuan besar">
                      {formData.satuan_besar_id && units.find(u => u.id === formData.satuan_besar_id) ? (
                        <span>{units.find(u => u.id === formData.satuan_besar_id)?.nama} ({units.find(u => u.id === formData.satuan_besar_id)?.kode})</span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {units.filter(u => u.tipe === "BESAR" || u.tipe === "KONVERSI").map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.nama} ({unit.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Satuan Kecil (opsional)</Label>
                <Select
                  value={formData.satuan_kecil_id || ""}
                  onValueChange={(v) =>
                    setFormData({ ...formData, satuan_kecil_id: v || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opsional">
                      {formData.satuan_kecil_id && units.find(u => u.id === formData.satuan_kecil_id) ? (
                        <span>{units.find(u => u.id === formData.satuan_kecil_id)?.nama} ({units.find(u => u.id === formData.satuan_kecil_id)?.kode})</span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {units.filter(u => u.tipe === "KECIL" || u.tipe === "KONVERSI").map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.nama} ({unit.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Faktor Konversi</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.konversi_factor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      konversi_factor: parseFloat(e.target.value) || 1,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  1 {units.find(u => u.id === formData.satuan_besar_id)?.nama} ={" "}
                  {formData.konversi_factor} {units.find(u => u.id === formData.satuan_kecil_id)?.nama}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pengaturan Stok */}
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Stok</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stok Minimum</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={formData.stok_minimum}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stok_minimum: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert saat stok &lt;= nilai ini
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Stok Maksimum</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={formData.stok_maximum}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stok_maximum: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Shelf Life (hari)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.shelf_life_days || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shelf_life_days: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Opsional"
                />
                <p className="text-xs text-muted-foreground">
                  Masa simpan bahan sebelum expired
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Storage Condition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Kondisi Penyimpanan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Storage Condition</Label>
                <Select
                  value={formData.storage_condition || ""}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      storage_condition: v || undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kondisi">
                      {formData.storage_condition ? (
                        <span>{STORAGE_OPTIONS.find(opt => opt.value === formData.storage_condition)?.label}</span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STORAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.storage_condition && (
                <div className="text-sm p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="font-medium text-blue-900 mb-1">Tips:</p>
                  <p className="text-blue-700">
                    {formData.storage_condition === "SUHU_RUANG" && "Simpan di tempat kering dan sejuk (20-30°C)"}
                    {formData.storage_condition === "DINGIN" && "Simpan di chiller (0-8°C), hindari pembekuan"}
                    {formData.storage_condition === "BEKU" && "Simpan di freezer (-18°C atau lebih dingin)"}
                    {formData.storage_condition === "KHUSUS" && "Ikuti instruksi khusus dari supplier"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/purchasing/raw-materials/${materialId}`}>
            <Button variant="outline" type="button" disabled={isSubmitting}>
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
