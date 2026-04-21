"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { useToast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TruckIcon,
  ArrowLeftIcon,
  SaveIcon,
  Loader2Icon,
} from "lucide-react";

interface POOption {
  id: string;
  po_number: string;
  supplier_name: string;
  status: string;
}

export default function CreateDeliveryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [poList, setPoList] = useState<POOption[]>([]);
  const [fetchingPOs, setFetchingPOs] = useState(true);

  const [formData, setFormData] = useState({
    po_id: "",
    no_surat_jalan: "",
    ekspedisi: "",
    no_resi: "",
    tanggal_kirim: new Date().toISOString().split("T")[0],
    tanggal_estimasi_tiba: "",
    catatan: "",
  });

  // Fetch approved POs that don't have delivery yet
  useEffect(() => {
    async function fetchPOs() {
      try {
        const res = await fetch("/api/purchasing/po?status=approved&limit=100");
        const data = await res.json();
        if (data.data) {
          setPoList(data.data.filter((po: any) => po.status === "approved" || po.status === "sent"));
        }
      } catch (e) {
        console.error("Failed to fetch POs:", e);
      } finally {
        setFetchingPOs(false);
      }
    }
    fetchPOs();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.po_id || !formData.no_surat_jalan) {
      toast({
        title: "Validasi Gagal",
        description: "PO dan No. Surat Jalan wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/purchasing/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Berhasil",
          description: `Delivery berhasil dibuat: ${data.data?.nomor_resi || ""}`,
        });
        router.push("/dashboard/purchasing/delivery");
      } else {
        throw new Error(data.error?.message || "Gagal membuat delivery");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedPO = poList.find((po) => po.id === formData.po_id);

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Pengiriman", href: "/dashboard/purchasing/delivery" },
          { label: "Buat Baru" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TruckIcon className="w-6 h-6" />
            Input Pengiriman Baru
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Catat pengiriman barang dari supplier
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/purchasing/delivery")}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PO Selection */}
                <div className="space-y-2">
                  <Label htmlFor="po_id">
                    Purchase Order <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.po_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, po_id: value })
                    }
                    disabled={fetchingPOs}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          fetchingPOs
                            ? "Memuat PO..."
                            : "Pilih Purchase Order"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {poList.length === 0 ? (
                        <SelectItem value="" disabled>
                          Tidak ada PO yang tersedia
                        </SelectItem>
                      ) : (
                        poList.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.po_number} - {po.supplier_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedPO && (
                    <p className="text-sm text-gray-500">
                      Supplier: {selectedPO.supplier_name}
                    </p>
                  )}
                </div>

                {/* No Surat Jalan */}
                <div className="space-y-2">
                  <Label htmlFor="no_surat_jalan">
                    No. Surat Jalan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="no_surat_jalan"
                    placeholder="Contoh: SJ-2025-0001"
                    value={formData.no_surat_jalan}
                    onChange={(e) =>
                      setFormData({ ...formData, no_surat_jalan: e.target.value })
                    }
                  />
                </div>

                {/* Ekspedisi */}
                <div className="space-y-2">
                  <Label htmlFor="ekspedisi">Ekspedisi / Kurir</Label>
                  <Input
                    id="ekspedisi"
                    placeholder="Contoh: JNE, J&T, SiCepat"
                    value={formData.ekspedisi}
                    onChange={(e) =>
                      setFormData({ ...formData, ekspedisi: e.target.value })
                    }
                  />
                </div>

                {/* No Resi */}
                <div className="space-y-2">
                  <Label htmlFor="no_resi">No. Resi / Tracking</Label>
                  <Input
                    id="no_resi"
                    placeholder="Contoh: JNE123456789"
                    value={formData.no_resi}
                    onChange={(e) =>
                      setFormData({ ...formData, no_resi: e.target.value })
                    }
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_kirim">Tanggal Kirim</Label>
                    <Input
                      id="tanggal_kirim"
                      type="date"
                      value={formData.tanggal_kirim}
                      onChange={(e) =>
                        setFormData({ ...formData, tanggal_kirim: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_estimasi_tiba">
                      Estimasi Tiba
                    </Label>
                    <Input
                      id="tanggal_estimasi_tiba"
                      type="date"
                      value={formData.tanggal_estimasi_tiba}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tanggal_estimasi_tiba: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Catatan</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Tambahkan catatan jika diperlukan..."
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aksi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !formData.po_id || !formData.no_surat_jalan}
                >
                  {loading ? (
                    <>
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4 mr-2" />
                      Simpan Pengiriman
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/dashboard/purchasing/delivery")}
                >
                  Batal
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-sm text-gray-600">
                <p className="mb-2 font-medium">Informasi:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Pilih PO yang sudah di-approve</li>
                  <li>No. Surat Jalan wajib diisi</li>
                  <li>Status awal: Menunggu</li>
                  <li>Setelah tiba, buat GRN</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
