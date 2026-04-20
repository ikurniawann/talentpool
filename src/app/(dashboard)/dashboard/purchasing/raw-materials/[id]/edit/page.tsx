"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";
import { useToast } from "@/components/ui/toast";
import { ChevronLeft, Save, Loader2, PencilSquareIcon } from "lucide-react";
import { KATEGORI_OPTIONS, Kategori } from "@/types/raw-material";
import { updateRawMaterial, CreateRawMaterialInput } from "@/lib/purchasing/raw-materials";
import { createClient } from "@/lib/supabase/client";

interface SatuanOption {
  id: string;
  kode: string;
  nama: string;
}

export default function EditRawMaterialPage() {
  return (
    <PurchasingGuard minRole="purchasing_admin">
      <EditRawMaterialInner />
    </PurchasingGuard>
  );
}

function EditRawMaterialInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Satuan dropdowns
  const [satuanBesar, setSatuanBesar] = useState<SatuanOption[]>([]);
  const [satuanKecil, setSatuanKecil] = useState<SatuanOption[]>([]);
  const [satuanBesarLoading, setSatuanBesarLoading] = useState(true);
  const [satuanKecilLoading, setSatuanKecilLoading] = useState(true);

  // Form values
  const [kodeBahan, setKodeBahan] = useState("");
  const [namaBahan, setNamaBahan] = useState("");
  const [kategori, setKategori] = useState<Kategori | "">("");
  const [satuanBesarId, setSatuanBesarId] = useState("");
  const [satuanKecilId, setSatuanKecilId] = useState("");
  const [konversiFactor, setKonversiFactor] = useState("1");
  const [stokMinimum, setStokMinimum] = useState("0");
  const [stokMaximum, setStokMaximum] = useState("");
  const [shelfLifeDays, setShelfLifeDays] = useState("0");
  const [storageCondition, setStorageCondition] = useState("ambient");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch material + satuan on mount
  useEffect(() => {
    if (!id) return;

    async function fetchAll() {
      setInitialLoading(true);

      // Fetch dropdowns
      const [{ data: sb }, { data: sk }] = await Promise.all([
        supabase.from("satuan").select("id, kode, nama").eq("is_active", true).order("nama"),
        supabase.from("satuan").select("id, kode, nama").eq("is_active", true).order("nama"),
      ]);

      setSatuanBesar(sb ?? []);
      setSatuanBesarLoading(false);
      setSatuanKecil(sk ?? []);
      setSatuanKecilLoading(false);

      // Fetch material
      const { data: mat, error } = await supabase
        .from("bahan_baku")
        .select(
          `
          id,
          kode,
          nama,
          kategori,
          shelf_life_days,
          storage_condition,
          minimum_stock,
          maximum_stock,
          konversi_factor,
          satuan_id,
          satuan_kecil_id
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error || !mat) {
        toast({
          title: "Gagal memuat",
          description: error?.message ?? "Bahan baku tidak ditemukan",
          variant: "destructive",
        });
        setInitialLoading(false);
        return;
      }

      setKodeBahan(mat.kode);
      setNamaBahan(mat.nama);
      setKategori((mat.kategori as Kategori) ?? "");
      setSatuanBesarId(mat.satuan_id ?? "");
      setSatuanKecilId(mat.satuan_kecil_id ?? "");
      setKonversiFactor(String(mat.konversi_factor ?? 1));
      setStokMinimum(String(mat.minimum_stock ?? 0));
      setStokMaximum(mat.maximum_stock != null ? String(mat.maximum_stock) : "");
      setShelfLifeDays(String(mat.shelf_life_days ?? 0));
      setStorageCondition(mat.storage_condition ?? "ambient");

      setInitialLoading(false);
    }

    fetchAll();
  }, [id, supabase, toast]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!namaBahan.trim()) newErrors.namaBahan = "Nama bahan wajib diisi";
    if (!satuanBesarId) newErrors.satuanBesarId = "Satuan besar wajib dipilih";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const input: Partial<CreateRawMaterialInput> = {
        nama_bahan: namaBahan.trim(),
        kategori: kategori as Kategori || undefined,
        satuan_besar_id: satuanBesarId,
        satuan_kecil_id: satuanKecilId || undefined,
        konversi_factor: parseFloat(konversiFactor) || 1,
        stok_minimum: parseFloat(stokMinimum) || 0,
        stok_maximum: parseFloat(stokMaximum) || undefined,
        shelf_life_days: parseInt(shelfLifeDays) || 0,
        storage_condition: storageCondition,
      };

      await updateRawMaterial(id!, input);
      toast({
        title: "Berhasil",
        description: `Bahan baku "${namaBahan}" berhasil diupdate.`,
      });
      router.push(`/dashboard/purchasing/raw-materials/${id}`);
    } catch (err: any) {
      toast({
        title: "Gagal",
        description: err.message ?? "Terjadi kesalahan saat menyimpan.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
          { label: kodeBahan },
          { label: "Edit" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Edit Bahan Baku</h1>
        <Link href={`/dashboard/purchasing/raw-materials/${id}`}>
          <Button variant="outline">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Informasi Bahan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Kode (read-only) */}
            <div className="space-y-2">
              <Label>Kode</Label>
              <Input value={kodeBahan} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-400">Kode tidak bisa diubah</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama */}
              <div className="space-y-2">
                <Label htmlFor="namaBahan">
                  Nama Bahan <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="namaBahan"
                  value={namaBahan}
                  onChange={(e) => setNamaBahan(e.target.value)}
                />
                {errors.namaBahan && (
                  <p className="text-xs text-red-500">{errors.namaBahan}</p>
                )}
              </div>

              {/* Kategori */}
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={kategori} onValueChange={setKategori}>
                  <SelectTrigger>
                    <SelectValue placeholder="— Pilih Kategori —" />
                  </SelectTrigger>
                  <SelectContent>
                    {KATEGORI_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Satuan Besar */}
              <div className="space-y-2">
                <Label htmlFor="satuanBesar">
                  Satuan Besar <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={satuanBesarId}
                  onValueChange={setSatuanBesarId}
                  disabled={satuanBesarLoading}
                >
                  <SelectTrigger id="satuanBesar">
                    <SelectValue placeholder="— Pilih Satuan —" />
                  </SelectTrigger>
                  <SelectContent>
                    {satuanBesar.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nama} ({s.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.satuanBesarId && (
                  <p className="text-xs text-red-500">{errors.satuanBesarId}</p>
                )}
              </div>

              {/* Satuan Kecil */}
              <div className="space-y-2">
                <Label>Satuan Kecil (opsional)</Label>
                <Select
                  value={satuanKecilId}
                  onValueChange={setSatuanKecilId}
                  disabled={satuanKecilLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="— Pilih Satuan Kecil —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tidak ada</SelectItem>
                    {satuanKecil.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nama} ({s.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Konversi Factor */}
              <div className="space-y-2">
                <Label>Faktor Konversi</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={konversiFactor}
                  onChange={(e) => setKonversiFactor(e.target.value)}
                />
              </div>

              {/* Stok Minimum */}
              <div className="space-y-2">
                <Label>Minimum Stok</Label>
                <Input
                  type="number"
                  min="0"
                  value={stokMinimum}
                  onChange={(e) => setStokMinimum(e.target.value)}
                />
              </div>

              {/* Stok Maximum */}
              <div className="space-y-2">
                <Label>Maximum Stok</Label>
                <Input
                  type="number"
                  min="0"
                  value={stokMaximum}
                  onChange={(e) => setStokMaximum(e.target.value)}
                  placeholder="Opsional"
                />
              </div>

              {/* Shelf Life */}
              <div className="space-y-2">
                <Label>Shelf Life (hari)</Label>
                <Input
                  type="number"
                  min="0"
                  value={shelfLifeDays}
                  onChange={(e) => setShelfLifeDays(e.target.value)}
                />
              </div>

              {/* Storage Condition */}
              <div className="space-y-2">
                <Label>Storage Condition</Label>
                <Select value={storageCondition} onValueChange={setStorageCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ambient">Ambient</SelectItem>
                    <SelectItem value="chilled">Chilled</SelectItem>
                    <SelectItem value="frozen">Frozen</SelectItem>
                    <SelectItem value="dry">Dry</SelectItem>
                    <SelectItem value="humid">Humid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/dashboard/purchasing/raw-materials/${id}`}>
            <Button variant="outline" type="button">
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
