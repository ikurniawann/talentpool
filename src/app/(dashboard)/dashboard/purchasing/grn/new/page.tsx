"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import { useToast } from "@/components/ui/toast";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";

interface Delivery {
  id: string;
  no_resi: string;
  nomor_resi: string;
  no_surat_jalan: string;
  kurir: string;
  status: string;
  purchase_order_id: string;
  supplier_id: string;
  tanggal_kirim: string;
  tanggal_estimasi_tiba: string;
}

interface POItem {
  id: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_ordered: number;
  qty_received: number;
  satuan?: string;
}

interface GrnItem {
  id: string;
  purchase_order_item_id?: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_diterima: number;
  qty_ditolak: number;
  kondisi: "baik" | "rusak" | "cacat";
  catatan: string;
}

export default function CreateGrnPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingDeliveries, setFetchingDeliveries] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [grnItems, setGrnItems] = useState<GrnItem[]>([]);
  const [formData, setFormData] = useState({
    delivery_id: "",
    tanggal_penerimaan: new Date().toISOString().split("T")[0],
    catatan: "",
  });

  // Fetch deliveries that can be received
  useEffect(() => {
    fetchDeliveries();
  }, []);

  async function fetchDeliveries() {
    setFetchingDeliveries(true);
    try {
      const res = await fetch("/api/purchasing/delivery?limit=100");
      const data = await res.json();
      if (data.data) {
        setDeliveries(data.data);
      }
    } catch (e) {
      console.error(e);
      toast({ 
        title: "Error", 
        description: "Gagal memuat data pengiriman", 
        variant: "destructive" 
      });
    } finally {
      setFetchingDeliveries(false);
    }
  }

  // Fetch PO items when delivery selected
  useEffect(() => {
    const poId = selectedDelivery?.purchase_order_id || selectedDelivery?.po_id;
    if (poId) {
      fetchPOItems(poId);
    }
  }, [selectedDelivery]);

  async function fetchPOItems(poId: string) {
    try {
      const res = await fetch(`/api/purchasing/po/${poId}`);
      const data = await res.json();
      if (data.data?.items) {
        const items = data.data.items.map((item: any) => ({
          id: item.id,
          raw_material_id: item.raw_material_id,
          nama_bahan: item.raw_material?.nama || item.raw_material?.nama_bahan || "Unknown",
          qty_ordered: item.qty_ordered || 0,
          qty_received: item.qty_received || 0,
          satuan: item.satuan?.nama || item.satuan?.nama_satuan || "pcs",
        }));
        setPoItems(items);
        // Initialize GRN items
        setGrnItems(items.map((item: POItem) => ({
          id: item.id,
          purchase_order_item_id: item.id,
          raw_material_id: item.raw_material_id,
          nama_bahan: item.nama_bahan,
          qty_diterima: 0,
          qty_ditolak: 0,
          kondisi: "baik",
          catatan: "",
        })));
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleDeliverySelect(deliveryId: string) {
    const delivery = deliveries.find((d) => d.id === deliveryId);
    setSelectedDelivery(delivery || null);
    setFormData((prev) => ({ ...prev, delivery_id: deliveryId }));
  }

  function updateGrnItem(index: number, field: keyof GrnItem, value: any) {
    setGrnItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate
      const validItems = grnItems.filter((item) => item.qty_diterima > 0 || item.qty_ditolak > 0);
      if (validItems.length === 0) {
        toast({ 
          title: "Error", 
          description: "Minimal 1 item harus diisi", 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      const payload = {
        ...formData,
        items: validItems.map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          raw_material_id: item.raw_material_id,
          qty_diterima: item.qty_diterima,
          qty_ditolak: item.qty_ditolak,
          kondisi: item.kondisi,
          catatan: item.catatan || null,
        })),
      };

      console.log("=== SUBMIT GRN ===");
      console.log("Payload:", payload);

      const res = await fetch("/api/purchasing/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("API Response:", res.status, data);

      if (res.ok) {
        toast({
          title: "✅ Berhasil",
          description: `GRN ${data.data?.nomor_grn || ""} berhasil dibuat`,
        });
        router.push("/dashboard/purchasing/grn");
        router.refresh();
      } else {
        throw new Error(data.error?.message || data.message || data.error || "Gagal membuat GRN");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Gagal membuat GRN",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Penerimaan", href: "/dashboard/purchasing/grn" },
          { label: "Input Penerimaan" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/grn">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Input Penerimaan Barang</h1>
          <p className="text-sm text-gray-500">Catat penerimaan barang dari pengiriman</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Delivery Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TruckIcon className="w-5 h-5" />
              Pilih Pengiriman
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fetchingDeliveries ? (
              <p className="text-gray-500">Memuat data pengiriman...</p>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TruckIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Tidak ada pengiriman yang menunggu penerimaan</p>
                <Link href="/dashboard/purchasing/delivery/new">
                  <Button variant="link" className="mt-2">Buat Pengiriman Baru</Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {deliveries.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => handleDeliverySelect(d.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDelivery?.id === d.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{d.no_surat_jalan || "Tanpa Surat Jalan"}</p>
                        <p className="text-sm text-gray-500">
                          {d.kurir} • {d.no_resi || d.nomor_resi}
                        </p>
                      </div>
                      <Badge variant={d.status === "pending" ? "secondary" : "default"}>
                        {d.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedDelivery && (
          <>
            {/* GRN Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardDocumentCheckIcon className="w-5 h-5" />
                  Informasi Penerimaan
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Penerimaan *</Label>
                  <Input
                    type="date"
                    value={formData.tanggal_penerimaan}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, tanggal_penerimaan: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Catatan</Label>
                  <Textarea
                    value={formData.catatan}
                    onChange={(e) => setFormData((prev) => ({ ...prev, catatan: e.target.value }))}
                    placeholder="Catatan penerimaan..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detail Item Diterima</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Bahan Baku</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Qty Order</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Sudah Terima</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Qty Diterima *</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Qty Ditolak</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">Kondisi</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {grnItems.map((item, index) => {
                        const poItem = poItems.find((p) => p.id === item.id);
                        const remaining = (poItem?.qty_ordered || 0) - (poItem?.qty_received || 0);
                        return (
                          <tr key={item.id}>
                            <td className="py-3 px-4">
                              <p className="font-medium">{item.nama_bahan}</p>
                              <p className="text-xs text-gray-500">Sisa: {remaining} {poItem?.satuan}</p>
                            </td>
                            <td className="py-3 px-4 text-center">{poItem?.qty_ordered || 0}</td>
                            <td className="py-3 px-4 text-center">{poItem?.qty_received || 0}</td>
                            <td className="py-3 px-4">
                              <Input
                                type="number"
                                min="0"
                                max={remaining}
                                value={item.qty_diterima}
                                onChange={(e) =>
                                  updateGrnItem(index, "qty_diterima", parseFloat(e.target.value) || 0)
                                }
                                className="w-24 mx-auto text-center"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                type="number"
                                min="0"
                                value={item.qty_ditolak}
                                onChange={(e) =>
                                  updateGrnItem(index, "qty_ditolak", parseFloat(e.target.value) || 0)
                                }
                                className="w-24 mx-auto text-center"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={item.kondisi}
                                onChange={(e) =>
                                  updateGrnItem(index, "kondisi", e.target.value)
                                }
                                className="w-full p-2 border rounded text-sm"
                              >
                                <option value="baik">Baik</option>
                                <option value="rusak">Rusak</option>
                                <option value="cacat">Cacat</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <Input
                                value={item.catatan}
                                onChange={(e) => updateGrnItem(index, "catatan", e.target.value)}
                                placeholder="Catatan..."
                                className="text-sm"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/purchasing/grn">
                <Button type="button" variant="outline">Batal</Button>
              </Link>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Menyimpan..." : "Simpan Penerimaan"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
