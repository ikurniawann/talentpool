"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Package, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
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
  { value: "DINGIN", label: "Dingin" },
  { value: "BEKU", label: "Beku" },
  { value: "KERING", label: "Kering" },
  { value: "TERTUTUP", label: "Tertutup Rapat" },
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
    kategori: "BAHAN_PANGAN" as MaterialCategory,
    deskripsi: "",
    satuan_besar_id: "",
    satuan_kecil_id: undefined as string | undefined,
    konversi_factor: 1,
    stok_minimum: 0,
    stok_maximum: 0,
    shelf_life_days: undefined as number | undefined,
    storage_condition: undefined as string | undefined,
  });

  useEffect(() => {
    loadMaterial();
    loadUnits();
  }, [materialId]);

  const loadMaterial = async () => {
    try {
      const data = await getRawMaterial(materialId);
      setMaterial(data);
      setFormData({
        nama: data.nama || "",
        kategori: data.kategori || "BAHAN_PANGAN",
        deskripsi: data.deskripsi || "",
        satuan_besar_id: data.satuan_besar_id || "",
        satuan_kecil_id: data.satuan_kecil_id || undefined,
        konversi_factor: data.konversi_factor || 1,
        stok_minimum: data.stok_minimum || 0,
        stok_maximum: data.stok_maximum || 0,
        shelf_life_days: data.shelf_life_days || undefined,
        storage_condition: data.storage_condition || undefined,
      });
    } catch (error) {
      console.error("Failed to load material:", error);
      toast.error("Gagal memuat data bahan baku");
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      const data = await listUnits();
      setUnits(data.data || []);
    } catch (error) {
      console.error("Failed to load units:", error);
    }
  };

  const satuanBesar = units.filter(u => u.tipe === "BESAR" || u.tipe === "KONVERSI");
  const satuanKecil = units.filter(u => u.tipe === "KECIL" || u.tipe === "KONVERSI");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nama) {
      toast.error("Nama bahan baku wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateRawMaterial(materialId, formData);
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
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-gray-500">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/purchasing/raw-materials/${materialId}`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Bahan Baku</h1>
          <p className="text-sm text-gray-500">Update detail bahan baku</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Main Grid - 2 Columns Balanced */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN - Info & Units */}
          <div className="space-y-6">
            
            {/* Informasi Dasar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Informasi Dasar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="kode" className="text-xs">Kode Bahan</Label>
                    <Input
                      id="kode"
                      value={material?.kode || ""}
                      disabled
                      className="h-9 text-sm bg-gray-50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="kategori" className="text-xs">Kategori <span className="text-red-500">*</span></Label>
                    <Combobox
                      options={CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                      value={formData.kategori}
                      onChange={(v) => setFormData({ ...formData, kategori: v as MaterialCategory })}
                      placeholder="Pilih kategori..."
                      searchPlaceholder="Cari..."
                      emptyMessage="Tidak ditemukan"
                      allowClear
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nama" className="text-xs">Nama Bahan Baku <span className="text-red-500">*</span></Label>
                  <Input
                    id="nama"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    maxLength={100}
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="deskripsi" className="text-xs">Deskripsi</Label>
                  <Textarea
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    placeholder="Deskripsi tambahan..."
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Satuan */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Satuan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="satuan_besar" className="text-xs">Satuan Besar <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={satuanBesar.map((u) => ({ value: u.id, label: u.nama, description: u.kode }))}
                    value={formData.satuan_besar_id}
                    onChange={(v) => setFormData({ ...formData, satuan_besar_id: v })}
                    placeholder="Pilih satuan..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada satuan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="satuan_kecil" className="text-xs">Satuan Kecil</Label>
                  <Combobox
                    options={[
                      { value: "", label: "Tidak ada", description: "Tanpa satuan kecil" },
                      ...satuanKecil.map((u) => ({ value: u.id, label: u.nama, description: u.kode })),
                    ]}
                    value={formData.satuan_kecil_id || ""}
                    onChange={(v) => setFormData({ ...formData, satuan_kecil_id: v || undefined })}
                    placeholder="Opsional..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Tidak ada satuan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>

                {formData.satuan_kecil_id && (
                  <div className="space-y-1.5">
                    <Label htmlFor="konversi" className="text-xs">Faktor Konversi</Label>
                    <Input
                      id="konversi"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.konversi_factor}
                      onChange={(e) => setFormData({ ...formData, konversi_factor: parseFloat(e.target.value) || 1 })}
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      1 {satuanBesar.find(u => u.id === formData.satuan_besar_id)?.nama} = {formData.konversi_factor} {satuanKecil.find(u => u.id === formData.satuan_kecil_id)?.nama}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT COLUMN - Stock Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Pengaturan Stok
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="stok_minimum" className="text-xs">Stok Minimum</Label>
                  <Input
                    id="stok_minimum"
                    type="number"
                    min="0"
                    value={formData.stok_minimum}
                    onChange={(e) => setFormData({ ...formData, stok_minimum: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-sm"
                  />
                  <p className="text-xs text-gray-500">Alert saat stok ≤ nilai ini</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stok_maximum" className="text-xs">Stok Maksimum</Label>
                  <Input
                    id="stok_maximum"
                    type="number"
                    min="0"
                    value={formData.stok_maximum}
                    onChange={(e) => setFormData({ ...formData, stok_maximum: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shelf_life" className="text-xs">Shelf Life (hari)</Label>
                <Input
                  id="shelf_life"
                  type="number"
                  min="0"
                  value={formData.shelf_life_days || ""}
                  onChange={(e) => setFormData({ ...formData, shelf_life_days: parseInt(e.target.value) || undefined })}
                  placeholder="Opsional"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="storage" className="text-xs">Kondisi Penyimpanan</Label>
                <Combobox
                  options={[
                    { value: "", label: "Tidak ada", description: "Tanpa kondisi khusus" },
                    ...STORAGE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
                  ]}
                  value={formData.storage_condition || ""}
                  onChange={(v) => setFormData({ ...formData, storage_condition: (v as any) || undefined })}
                  placeholder="Pilih kondisi..."
                  searchPlaceholder="Cari..."
                  emptyMessage="Tidak ditemukan"
                  allowClear
                  className="h-9 text-sm"
                />
              </div>
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
