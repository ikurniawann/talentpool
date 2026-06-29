"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { DsDateTimePicker } from "@/components/design-system";
import { toast } from "sonner";
import {
  TruckIcon,
  ArrowLeftIcon,
  SaveIcon,
  Loader2Icon,
  Package,
} from "lucide-react";
import { useDeliveryPOOptions, usePOItemsForDelivery } from "../queries";
import { useCreateDelivery } from "../mutations";
import { formatCurrency, formatQuantity } from "../utils";
import type { PurchaseOrderItem } from "@/types/purchasing";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const VALID_PO_STATUSES = ["approved", "sent", "partial", "partially_received"];

export function CreateDeliveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    po_id: "",
    supplier_id: "",
    no_surat_jalan: "",
    kurir: "",
    no_resi: "",
    tanggal_kirim: new Date().toISOString().split("T")[0],
    tanggal_estimasi_tiba: "",
    catatan: "",
  });

  const poOptionsQuery = useDeliveryPOOptions(false);
  const fetchingPOs = poOptionsQuery.isLoading;
  const poList = (poOptionsQuery.data ?? []).filter((po) =>
    VALID_PO_STATUSES.includes(po.status?.toLowerCase() || "")
  );

  const createMutation = useCreateDelivery();
  const loading = createMutation.isPending;

  useEffect(() => {
    const poId = searchParams.get("po_id");
    if (poId) {
      const po = poList.find((p) => p.id === poId);
      if (po) {
        setFormData((prev) =>
          prev.po_id ? prev : { ...prev, po_id: poId, supplier_id: po.supplier_id }
        );
      }
    }
  }, [searchParams, poList]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.po_id || !formData.no_surat_jalan) {
      toast.error("PO dan No. Surat Jalan wajib diisi");
      return;
    }

    try {
      const data = await createMutation.mutateAsync(formData);
      toast.success(`Delivery ${data.nomor_resi || ""} berhasil dibuat`);
      router.push(data.id ? `/dashboard/purchasing/delivery/${data.id}` : "/dashboard/purchasing/delivery");
      router.refresh();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Gagal membuat delivery"));
    }
  }

  const selectedPO = poList.find((po) => po.id === formData.po_id);

  const poItemsQuery = usePOItemsForDelivery(formData.po_id);
  const poItems: PurchaseOrderItem[] = poItemsQuery.data ?? [];
  const fetchingPOItems = poItemsQuery.isLoading;

  return (
    <div className="space-y-6">
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
                      description: po.nama_supplier ?? undefined,
                    }))}
                    value={formData.po_id}
                    onChange={(value) => {
                      const po = poList.find((p) => p.id === value);
                      setFormData((prev) => ({
                        ...prev,
                        po_id: value,
                        supplier_id: po?.supplier_id || "",
                      }));
                    }}
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
                  <Label htmlFor="kurir">Ekspedisi / Kurir</Label>
                  <Input
                    id="kurir"
                    placeholder="Contoh: JNE, J&T, SiCepat"
                    value={formData.kurir}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, kurir: e.target.value }))
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
                  <DsDateTimePicker
                    label="Tanggal Kirim"
                    value={formData.tanggal_kirim}
                    onChange={(v) => setFormData((prev) => ({ ...prev, tanggal_kirim: v }))}
                    placeholder="Tanggal kirim..."
                    dateOnly
                  />
                  <DsDateTimePicker
                    label="Estimasi Tiba"
                    value={formData.tanggal_estimasi_tiba}
                    onChange={(v) => setFormData((prev) => ({ ...prev, tanggal_estimasi_tiba: v }))}
                    placeholder="Estimasi tiba..."
                    dateOnly
                  />
                </div>
              </CardContent>
            </Card>

            {formData.po_id && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="w-5 h-5" />
                    Detail Item Purchase Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {fetchingPOItems ? (
                    <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                      <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                      Memuat item PO...
                    </div>
                  ) : poItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      Tidak ada item pada PO ini
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold">Bahan Baku</th>
                            <th className="px-4 py-3 text-right font-semibold">Jumlah</th>
                            <th className="px-4 py-3 text-left font-semibold">Satuan</th>
                            <th className="px-4 py-3 text-right font-semibold">Harga Satuan</th>
                            <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {poItems.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">
                                  {item.raw_material?.nama}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.raw_material?.kode}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-700">
                                {formatQuantity(item.qty_ordered)}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {item.satuan?.nama || item.raw_material?.satuan_besar?.nama || item.raw_material?.satuan || "-"}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-700">
                                {formatCurrency(item.harga_satuan)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
