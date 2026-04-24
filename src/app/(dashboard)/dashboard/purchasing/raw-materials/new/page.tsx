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
import { ArrowLeft, Save, Package } from "lucide-react";
import { toast } from "sonner";
import { Unit, MaterialCategory, RawMaterialFormData } from "@/types/purchasing";
import { listUnits, createRawMaterial } from "@/lib/purchasing";
import { Combobox } from "@/components/ui/combobox";

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

export default function NewRawMaterialPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<RawMaterialFormData>({
    kode: "",
    nama: "",
    kategori: "BAHAN_PANGAN",
    deskripsi: "",
    satuan_besar_id: "",
    satuan_kecil_id: "",
    konversi_factor: 1,
    stok_minimum: 0,
    stok_maximum: 0,
    shelf_life_days: undefined,
    storage_condition: undefined,
  });

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      const data = await listUnits();
      setUnits(data.data || []);
    } catch (error) {
      console.error("Error loading units:", error);
      toast.error("Gagal memuat data satuan");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi
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
      // Prepare data - convert empty string to undefined for optional fields
      const dataToSubmit = {
        ...formData,
        kode: formData.kode || undefined,
        deskripsi: formData.deskripsi || undefined,
        satuan_kecil_id: formData.satuan_kecil_id || undefined,
        shelf_life_days: formData.shelf_life_days || undefined,
        storage_condition: formData.storage_condition || undefined,
        // Map field names to match API schema
        minimum_stock: formData.stok_minimum,
        maximum_stock: formData.stok_maximum,
      };

      // Remove old field names
      delete (dataToSubmit as any).stok_minimum;
      delete (dataToSubmit as any).stok_maximum;

      await createRawMaterial(dataToSubmit);
      toast.success("Bahan baku berhasil ditambahkan");
      router.push("/dashboard/purchasing/raw-materials");
    } catch (error: any) {
      console.error("Error creating material:", error);
      toast.error(error.message || "Gagal menambahkan bahan baku");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter satuan berdasarkan tipe
  const satuanBesar = units.filter((u) => u.tipe === "BESAR" || u.tipe === "KONVERSI");
  const satuanKecil = units.filter((u) => u.tipe === "KECIL" || u.tipe === "KONVERSI");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/raw-materials">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Tambah Bahan Baku</h1>
          <p className="text-muted-foreground">
            Isi detail bahan baku baru
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
                  <Label htmlFor="kode">Kode Bahan</Label>
                  <Input
                    id="kode"
                    value={formData.kode}
                    onChange={(e) =>
                      setFormData({ ...formData, kode: e.target.value })
                    }
                    placeholder="Kosongkan untuk auto-generate"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">
                    Boleh dikosongkan atau isi manual bebas
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kategori">
                    Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={CATEGORY_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    }))}
                    value={formData.kategori}
                    onChange={(v) =>
                      setFormData({
                        ...formData,
                        kategori: v as MaterialCategory,
                      })
                    }
                    placeholder="Pilih kategori..."
                    searchPlaceholder="Cari kategori..."
                    emptyMessage="Kategori tidak ditemukan"
                    allowClear
                  />
                  <p className="text-xs text-muted-foreground">
                    Contoh: Bahan Pangan, Bahan Non-Pangan, Kemasan
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nama">
                  Nama Bahan Baku <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  placeholder="Contoh: Gula Pasir Premium"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Textarea
                  id="deskripsi"
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  placeholder="Deskripsi tambahan tentang bahan..."
                  rows={3}
                />
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
                <Label htmlFor="satuan_besar">
                  Satuan Besar <span className="text-red-500">*</span>
                </Label>
                <Combobox
                  options={satuanBesar.map((u) => ({
                    value: u.id,
                    label: u.nama,
                    description: u.kode,
                  }))}
                  value={formData.satuan_besar_id}
                  onChange={(v) =>
                    setFormData({ ...formData, satuan_besar_id: v })
                  }
                  placeholder="Pilih satuan besar..."
                  searchPlaceholder="Cari satuan (nama/kode)..."
                  emptyMessage="Tidak ada satuan yang cocok"
                  disabled={loading}
                  allowClear
                />
                <p className="text-xs text-muted-foreground">
                  Contoh: Kilogram (KG), Liter (LT)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="satuan_kecil">Satuan Kecil</Label>
                <Combobox
                  options={[
                    { value: "", label: "Tidak ada", description: "Tanpa satuan kecil" },
                    ...satuanKecil.map((u) => ({
                      value: u.id,
                      label: u.nama,
                      description: u.kode,
                    })),
                  ]}
                  value={formData.satuan_kecil_id || ""}
                  onChange={(v) =>
                    setFormData({ ...formData, satuan_kecil_id: v || undefined })
                  }
                  placeholder="Pilih satuan kecil (opsional)..."
                  searchPlaceholder="Cari satuan (nama/kode)..."
                  emptyMessage="Tidak ada satuan yang cocok"
                  disabled={loading}
                  allowClear
                />
                <p className="text-xs text-muted-foreground">
                  Contoh: Gram (GR), Milliliter (ML) - untuk konversi
                </p>
              </div>

              {formData.satuan_kecil_id && (
                <div className="space-y-2">
                  <Label htmlFor="konversi">Faktor Konversi</Label>
                  <Input
                    id="konversi"
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
                    placeholder="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    1 {formData.satuan_besar_id && units.find((u) => u.id === formData.satuan_besar_id)?.nama} ={" "}
                    {formData.konversi_factor} {formData.satuan_kecil_id &&
                      units.find((u) => u.id === formData.satuan_kecil_id)?.nama}
                  </p>
                </div>
              )}
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
                  <Label htmlFor="stok_min">Stok Minimum</Label>
                  <Input
                    id="stok_min"
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
                  <Label htmlFor="stok_max">Stok Maksimum</Label>
                  <Input
                    id="stok_max"
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
                <Label htmlFor="shelf_life">Shelf Life (hari)</Label>
                <Input
                  id="shelf_life"
                  type="number"
                  min="0"
                  value={formData.shelf_life_days || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shelf_life_days: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="Opsional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage">Kondisi Penyimpanan</Label>
                <Combobox
                  options={[
                    { value: "", label: "Tidak ada", description: "Tanpa kondisi khusus" },
                    ...STORAGE_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    })),
                  ]}
                  value={formData.storage_condition || ""}
                  onChange={(v) =>
                    setFormData({
                      ...formData,
                      storage_condition: (v as any) || undefined,
                    })
                  }
                  placeholder="Pilih kondisi penyimpanan (opsional)..."
                  searchPlaceholder="Cari kondisi..."
                  emptyMessage="Kondisi tidak ditemukan"
                  allowClear
                />
                <p className="text-xs text-muted-foreground">
                  Contoh: Suhu Ruang, Dingin, Beku
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-end justify-end gap-4">
            <Link href="/dashboard/purchasing/raw-materials">
              <Button variant="outline" disabled={isSubmitting}>
                Batal
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? "Menyimpan..." : "Simpan Bahan Baku"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
