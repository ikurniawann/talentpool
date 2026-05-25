"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import { Combobox } from "@/components/ui/combobox";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { toast } from "sonner";
import {
  TruckIcon,
  ArrowLeftIcon,
  SaveIcon,
  Loader2Icon,
} from "lucide-react";

interface POOption {
  id: string;
  nomor_po: string;
  nama_supplier: string;
  status: string;
}

type DeliveryApiResponse = {
  data?: {
    nomor_resi?: string;
  };
  message?: string;
  error?: { message?: string } | string;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function CreateDeliveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  useEffect(() => {
    async function fetchPOs() {
      try {
        const res = await fetch("/api/purchasing/po?limit=100");
        const data = await res.json();
        
        if (data.data) {
          const validStatuses = ["approved", "sent", "partial", "partially_received"];
          const availablePOs = (data.data as POOption[]).filter((po) => {
            const status = po.status?.toLowerCase() || "";
            return validStatuses.includes(status);
          });
          setPoList(availablePOs);
          const poId = searchParams.get("po_id");
          if (poId && availablePOs.some((po: POOption) => po.id === poId)) {
            setFormData((prev) => ({ ...prev, po_id: poId }));
          }
        }
      } catch (e) {
        console.error("Failed to fetch POs:", e);
      } finally {
        setFetchingPOs(false);
      }
    }
    fetchPOs();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.po_id || !formData.no_surat_jalan) {
      toast.error("PO dan No. Surat Jalan wajib diisi");
      return;
    }

    setLoading(true);
    try {
      console.log("=== SUBMIT DELIVERY FORM ===");
      console.log("formData:", formData);
      
      const res = await fetch("/api/purchasing/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = (await res.json()) as DeliveryApiResponse;
      console.log("API Response:", res.status, data);
      
      if (res.ok) {
        toast.success(`Delivery ${data.data?.nomor_resi || ""} berhasil dibuat`);
        router.push(data.data?.id ? `/dashboard/purchasing/delivery/${data.data.id}` : "/dashboard/purchasing/delivery");
        router.refresh();
      } else {
        const apiError = typeof data.error === "string" ? data.error : data.error?.message;
        toast.error(apiError || data.message || "Gagal membuat delivery");
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Gagal membuat delivery"));
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
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Pengiriman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Purchase Order <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={poList.map((po) => ({
                      value: po.id,
                      label: po.nomor_po,
                      description: po.nama_supplier,
                    }))}
                    value={formData.po_id}
                    onChange={(value) => setFormData((prev) => ({ ...prev, po_id: value }))}
                    placeholder={fetchingPOs ? "Memuat PO..." : "Pilih Purchase Order"}
                    searchPlaceholder="Cari PO atau supplier..."
                    emptyMessage="Tidak ada PO yang ditemukan"
                    allowClear
                    disabled={fetchingPOs}
                    className="!w-full h-9 text-sm"
                  />
                  {selectedPO && (
                    <p className="text-xs text-gray-500">
                      Supplier: {selectedPO.nama_supplier}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no_surat_jalan">
                    No. Surat Jalan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="no_surat_jalan"
                    placeholder="Contoh: SJ-2025-0001"
                    value={formData.no_surat_jalan}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, no_surat_jalan: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ekspedisi">Ekspedisi / Kurir</Label>
                  <Input
                    id="ekspedisi"
                    placeholder="Contoh: JNE, J&T, SiCepat"
                    value={formData.ekspedisi}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ekspedisi: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no_resi">No. Resi / Tracking</Label>
                  <Input
                    id="no_resi"
                    placeholder="Contoh: JNE123456789"
                    value={formData.no_resi}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, no_resi: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_kirim">Tanggal Kirim</Label>
                    <DatePicker
                      id="tanggal_kirim"
                      value={formData.tanggal_kirim}
                      onChange={(v) => setFormData((prev) => ({ ...prev, tanggal_kirim: v }))}
                      placeholder="Tanggal kirim..."
                      variant="neutral"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_estimasi_tiba">Estimasi Tiba</Label>
                    <DatePicker
                      id="tanggal_estimasi_tiba"
                      value={formData.tanggal_estimasi_tiba}
                      onChange={(v) => setFormData((prev) => ({ ...prev, tanggal_estimasi_tiba: v }))}
                      placeholder="Estimasi tiba..."
                      variant="neutral"
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
                  placeholder="Tambahkan catatan jika diperlikan..."
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, catatan: e.target.value }))
                  }
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

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
                  <li>Status awal: Menunggu penerimaan</li>
                  <li>Lanjutkan dari detail pengiriman untuk input penerimaan GRN</li>
                  <li>GRN akan menambah stok bahan dan update progress PO</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
