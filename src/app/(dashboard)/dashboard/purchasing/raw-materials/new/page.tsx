"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import PurchasingGuard from "@/modules/purchasing/components/auth/PurchasingGuard";
import { useToast } from "@/components/ui/toast";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { KATEGORI_OPTIONS, Kategori } from "@/types/raw-material";
import { createRawMaterial, CreateRawMaterialInput } from "@/lib/purchasing/raw-materials";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SatuanOption {
  id: string;
  kode: string;
  nama: string;
}

export default function NewRawMaterialPage() {
  return (
    <PurchasingGuard minRole="purchasing_staff">
      <NewRawMaterialInner />
    </PurchasingGuard>
  );
}

function NewRawMaterialInner() {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [loading, setLoading] = useState(false);
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

  // Fetch satuan lists on mount
  useEffect(() => {
    const supabase = createClient();

    async function fetchSatuan() {
      // Fetch satuan besar
      const { data: sb } = await supabase
        .from("satuan")
        .select("id, kode, nama")
        .eq("is_active", true)
        .order("nama");

      setSatuanBesar(sb ?? []);
      setSatuanBesarLoading(false);

      // Fetch satuan kecil
      const { data: sk } = await supabase
        .from("satuan")
        .select("id, kode, nama")
        .eq("is_active", true)
        .order("nama");

      setSatuanKecil(sk ?? []);
      setSatuanKecilLoading(false);
    }

    fetchSatuan();
  }, []);

  // Auto-generate kode when nama is filled
  useEffect(() => {
    if (namaBahan && !kodeBahan) {
      const prefix = namaBahan
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 3);
      const rand = Math.floor(Math.random() * 900 + 100);
      setKodeBahan(`${prefix || "BB"}-${rand}`);
    }
  }, [namaBahan, kodeBahan]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!namaBahan.trim()) {
      newErrors.namaBahan = "Nama bahan wajib diisi";
    }
    if (!satuanBesarId) {
      newErrors.satuanBesarId = "Satuan besar wajib dipilih";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const input: CreateRawMaterialInput = {
        kode_bahan: kodeBahan,
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

      await createRawMaterial(input);
      toast({
        title: "Berhasil",
        description: `Bahan baku "${namaBahan}" berhasil ditambahkan.`,
      });
      router.push("/dashboard/purchasing/raw-materials");
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

  return (
    <div className="space-y-6 max-w-4xl">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Bahan Baku", href: "/dashboard/purchasing/raw-materials" },
          { label: "Tambah Bahan" },
        ]}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tambah Bahan Baku</h1>
        <Link href="/dashboard/purchasing/raw-materials">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kode */}
              <div className="space-y-2">
                <Label>Kode Bahan</Label>
                <Input
                  value={kodeBahan}
                  onChange={(e) => setKodeBahan(e.target.value.toUpperCase())}
                  placeholder="Auto-generate atau input manual"
                  className="uppercase"
                />
                <p className="text-xs text-gray-400">Akan di-generate otomatis jika kosong</p>
              </div>

              {/* Nama */}
              <div className="space-y-2">
                <Label htmlFor="namaBahan">
                  Nama Bahan <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="namaBahan"
                  value={namaBahan}
                  onChange={(e) => setNamaBahan(e.target.value)}
                  placeholder="Nama bahan baku"
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
                  placeholder="1"
                />
                <p className="text-xs text-gray-400">
                  {satuanKecilId
                    ? `1 ${satuanBesar.find((s) => s.id === satuanBesarId)?.nama ?? "satuan besar"} = ? ${satuanKecil.find((s) => s.id === satuanKecilId)?.nama ?? "satuan kecil"}`
                    : "Isi jika ada satuan kecil"}
                </p>
              </div>

              {/* Stok Minimum */}
              <div className="space-y-2">
                <Label>Minimum Stok</Label>
                <Input
                  type="number"
                  min="0"
                  value={stokMinimum}
                  onChange={(e) => setStokMinimum(e.target.value)}
                  placeholder="0"
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
                  placeholder="0"
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
          <Link href="/dashboard/purchasing/raw-materials">
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
                Simpan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
