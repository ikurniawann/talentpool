"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/datepicker";
import { Combobox } from "@/components/ui/combobox";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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
  ekspedisi?: string;
  status: string;
  purchase_order_id: string;
  supplier_id: string;
  tanggal_kirim: string;
  tanggal_estimasi_tiba: string;
  supplier_name?: string;
  po_number?: string;
  po_id?: string;
  search_text?: string;
}

interface POItem {
  id: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_ordered: number;
  qty_received: number;
  satuan?: string;
}

type POItemApiRow = {
  id: string;
  raw_material_id: string;
  nama_bahan?: string;
  qty_ordered?: number;
  qty_received?: number;
  raw_material?: {
    nama?: string;
  } | null;
  satuan?: string | {
    nama?: string;
  } | null;
  unit?: {
    nama?: string;
  } | null;
};

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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [, setFetchingDeliveries] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [grnItems, setGrnItems] = useState<GrnItem[]>([]);
  const [formData, setFormData] = useState({
    delivery_id: "",
    tanggal_penerimaan: new Date().toISOString().split("T")[0],
    catatan: "",
  });

  const fetchDeliveries = useCallback(async () => {
    setFetchingDeliveries(true);
    try {
      const res = await fetch("/api/purchasing/delivery?limit=100");
      const data = await res.json();
      console.log('Deliveries API response:', data);
      if (data.data && Array.isArray(data.data)) {
        // Enhance delivery data with searchable text and safe defaults
        const enhanced = (data.data as Array<Partial<Delivery> & {
          po_id?: string;
          delivery_number?: string;
          ekspedisi?: string;
          vendor_name?: string;
        }>).map((d) => ({
          id: d.id,
          no_resi: d.no_resi || d.nomor_resi || d.delivery_number || '',
          nomor_resi: d.nomor_resi || d.no_resi || d.delivery_number || '',
          no_surat_jalan: d.no_surat_jalan || '',
          kurir: d.kurir || d.ekspedisi || d.vendor_name || '',
          status: d.status || 'pending',
          purchase_order_id: d.purchase_order_id || d.po_id || '',
          po_id: d.po_id || d.purchase_order_id || '',
          supplier_id: d.supplier_id || '',
          tanggal_kirim: d.tanggal_kirim || '',
          tanggal_estimasi_tiba: d.tanggal_estimasi_tiba || '',
          supplier_name: d.supplier_name || d.kurir || d.ekspedisi || d.no_surat_jalan || d.no_resi || 'Unknown',
          po_number: d.po_number || d.nomor_resi || d.no_resi || '',
          search_text: `${d.no_resi || ''} ${d.nomor_resi || ''} ${d.no_surat_jalan || ''} ${d.kurir || ''} ${d.ekspedisi || ''}`.toLowerCase(),
        })) as Delivery[];
        console.log('Enhanced deliveries:', enhanced);
        setDeliveries(enhanced);
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
  }, [toast]);

  // Fetch deliveries that can be received
  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  useEffect(() => {
    const deliveryId = searchParams.get("delivery_id");
    if (!deliveryId || selectedDelivery || deliveries.length === 0) return;
    const delivery = deliveries.find((item) => item.id === deliveryId);
    if (delivery) {
      setSelectedDelivery(delivery);
      setFormData((prev) => ({ ...prev, delivery_id: delivery.id }));
    }
  }, [deliveries, searchParams, selectedDelivery]);

  // Fetch PO items when delivery selected
  const fetchPOItems = useCallback(async (poId: string) => {
    try {
      const res = await fetch(`/api/purchasing/po/${poId}/items`);
      const data = await res.json();
      console.log('PO Items response:', data);
      if (data.data && Array.isArray(data.data)) {
        // Extract only the fields we need to avoid rendering complex objects
        const simplifiedPoItems: POItem[] = (data.data as POItemApiRow[]).map((item) => ({
          id: item.id,
          raw_material_id: item.raw_material_id,
          nama_bahan: typeof item.nama_bahan === 'string' ? item.nama_bahan : (item.raw_material?.nama || 'Unknown'),
          qty_ordered: typeof item.qty_ordered === 'number' ? item.qty_ordered : 0,
          qty_received: typeof item.qty_received === 'number' ? item.qty_received : 0,
          satuan: typeof item.satuan === 'string' ? item.satuan : (item.satuan?.nama || item.unit?.nama || 'pcs'),
        }));
        setPoItems(simplifiedPoItems);
        // Initialize GRN items from PO items
        const initialGrnItems: GrnItem[] = simplifiedPoItems.map((item: POItem) => ({
          id: crypto.randomUUID(),
          purchase_order_item_id: item.id,
          raw_material_id: item.raw_material_id,
          nama_bahan: item.nama_bahan,
          qty_diterima: Math.max(0, item.qty_ordered - item.qty_received),
          qty_ditolak: 0,
          kondisi: "baik" as const,
          catatan: "",
        }));
        setGrnItems(initialGrnItems);
      }
    } catch (e) {
      console.error(e);
      toast({ 
        title: "Error", 
        description: "Gagal memuat item PO", 
        variant: "destructive" 
      });
    }
  }, [toast]);

  useEffect(() => {
    const poId = selectedDelivery?.purchase_order_id;
    if (poId) {
      console.log('Fetching PO items for:', poId);
      fetchPOItems(poId);
    } else {
      setPoItems([]);
      setGrnItems([]);
    }
  }, [fetchPOItems, selectedDelivery]);

  const handleAddItem = () => {
    setGrnItems([
      ...grnItems,
      {
        id: crypto.randomUUID(),
        raw_material_id: "",
        nama_bahan: "",
        qty_diterima: 0,
        qty_ditolak: 0,
        kondisi: "baik",
        catatan: "",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setGrnItems(grnItems.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof GrnItem, value: GrnItem[keyof GrnItem]) => {
    setGrnItems(
      grnItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const fillAllRemaining = () => {
    setGrnItems((items) =>
      items.map((item) => {
        const poItem = poItems.find((p) => p.id === item.purchase_order_item_id);
        const remaining = poItem ? Math.max(0, poItem.qty_ordered - poItem.qty_received) : item.qty_diterima;
        return { ...item, qty_diterima: remaining, qty_ditolak: 0, kondisi: "baik" };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.delivery_id) {
      toast({
        title: "Error",
        description: "Pilih pengiriman terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (grnItems.length === 0) {
      toast({
        title: "Error",
        description: "Tambahkan minimal 1 item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/purchasing/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: grnItems,
        }),
      });

      const responseText = await response.text();
      let result: { success?: boolean; error?: string; message?: string } | null = null;
      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch {
        result = { error: responseText || "Response server tidak valid" };
      }

      if (!response.ok || result?.success === false) {
        const message =
          result?.error ||
          result?.message ||
          "Gagal membuat penerimaan barang";
        throw new Error(message);
      }

      toast({
        title: "Berhasil",
        description: "Penerimaan barang berhasil dibuat",
      });
      router.push("/dashboard/purchasing/grn");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal membuat penerimaan barang",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { href: "/dashboard/purchasing", label: "Purchasing" },
          { href: "/dashboard/purchasing/grn", label: "Barang Masuk" },
          { label: "Buat Penerimaan Baru" },
        ]}
      />

      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200/70 pb-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Buat Penerimaan Baru</h1>
          <p className="text-sm text-gray-500">Pilih delivery, cek sisa PO, lalu simpan penerimaan untuk menambah stok</p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="purchasing-secondary-button w-full sm:w-auto">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Panel - Delivery Selection & Info (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-gray-200/70 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <TruckIcon className="w-5 h-5" />
                  1. Pilih Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Pengiriman</Label>
                  <Combobox
                    options={deliveries.map((delivery) => ({
                      value: delivery.id,
                      label: delivery.no_resi || delivery.nomor_resi || delivery.no_surat_jalan,
                      description: `${delivery.supplier_name || delivery.kurir || "-"} · ${delivery.po_number || delivery.no_surat_jalan || "-"}`,
                    }))}
                    value={formData.delivery_id}
                    onChange={(value) => {
                      const delivery = deliveries.find((item) => item.id === value) || null;
                      setSelectedDelivery(delivery);
                      setFormData((prev) => ({ ...prev, delivery_id: value }));
                    }}
                    placeholder="Pilih pengiriman..."
                    searchPlaceholder="Cari nomor resi / surat jalan..."
                    emptyMessage="Tidak ada pengiriman ditemukan"
                    allowClear
                    className="!w-full h-9 text-sm"
                  />
                </div>

                {selectedDelivery && (
                  <div className="mt-4 space-y-3 border-t border-gray-200/70 pt-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">No. Resi</span>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedDelivery.no_resi}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Surat Jalan</span>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedDelivery.no_surat_jalan || "-"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kurir</span>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedDelivery.kurir || "-"}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                      <div className="mt-1">
                        <Badge variant="outline" className="font-medium">{selectedDelivery.status}</Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informasi Penerimaan */}
                <div className="mt-4 space-y-3 border-t border-gray-200/70 pt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tanggal">Tanggal Penerimaan</Label>
                    <DatePicker
                      id="tanggal"
                      value={formData.tanggal_penerimaan}
                      onChange={(date) =>
                        setFormData((prev) => ({ ...prev, tanggal_penerimaan: date }))
                      }
                      variant="neutral"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="catatan" className="text-sm font-medium">Catatan</Label>
                    <Textarea
                      id="catatan"
                      value={formData.catatan || ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, catatan: e.target.value }))}
                      placeholder="Catatan tambahan (opsional)"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Items Table (8 cols) */}
          <div className="lg:col-span-8">
            <Card className="h-full border-gray-200/70 shadow-sm">
              <CardHeader className="border-b border-gray-100 px-4 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="w-5 h-5" />
                    2. Konfirmasi Item Diterima
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={fillAllRemaining} disabled={grnItems.length === 0} className="purchasing-secondary-button">
                      Isi Sisa PO
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="purchasing-secondary-button">
                      <PlusIcon className="w-4 h-4 mr-1.5" />
                      Item Manual
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {grnItems.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Pilih delivery di kiri untuk menarik item PO otomatis
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-2.5">Bahan Baku</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-20">Ordered</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-20">Received</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-20">Sisa</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-24">Terima</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-24">Ditolak</th>
                        <th className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2.5 w-28">Kondisi</th>
                        <th className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wide px-4 py-2.5 w-16">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {grnItems.map((item) => {
                        const poItem = poItems.find((p) => p.id === item.purchase_order_item_id);
                        const qtyOrdered = typeof poItem?.qty_ordered === 'number' ? poItem.qty_ordered : 0;
                        const qtyReceived = typeof poItem?.qty_received === 'number' ? poItem.qty_received : 0;
                        const qtyRemaining = Math.max(0, qtyOrdered - qtyReceived);
                        const satuan = typeof poItem?.satuan === 'string' ? poItem.satuan : 'pcs';
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">{item.nama_bahan || "Item manual"}</div>
                              {poItem && qtyOrdered > 0 && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  PO: {qtyOrdered} {satuan}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm text-gray-600">{qtyOrdered}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm text-gray-600">{qtyReceived}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-sm font-semibold text-pink-700">{qtyRemaining}</span>
                            </td>
                            <td className="px-3 py-3">
                              <NumericInput
                                min="0"
                                max={qtyRemaining || undefined}
                                value={item.qty_diterima}
                                onValueChange={(value) => handleUpdateItem(item.id, "qty_diterima", value || 0)}
                                decimalScale={4}
                                className="w-20 text-center text-sm h-9"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <NumericInput
                                min="0"
                                value={item.qty_ditolak}
                                onValueChange={(value) => handleUpdateItem(item.id, "qty_ditolak", value || 0)}
                                decimalScale={4}
                                className="w-20 text-center text-sm h-9"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Combobox
                                options={[
                                  { value: "baik", label: "Baik" },
                                  { value: "rusak", label: "Rusak" },
                                  { value: "cacat", label: "Cacat" },
                                ]}
                                value={item.kondisi}
                                onChange={(value) => handleUpdateItem(item.id, "kondisi", value as "baik" | "rusak" | "cacat")}
                                placeholder="Kondisi..."
                                searchPlaceholder="Cari kondisi..."
                                emptyMessage="Kondisi tidak ditemukan"
                                className="!w-full h-9 text-sm"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
              <div className="flex justify-end gap-3 border-t border-gray-200/70 bg-gray-50 px-4 py-4">
                <Button type="button" variant="outline" onClick={() => router.back()} className="purchasing-secondary-button px-6">
                  Batal
                </Button>
                <Button type="submit" disabled={loading || grnItems.length === 0} className="purchasing-main-button px-6">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 mr-2" />
                  {loading ? "Menyimpan..." : "Simpan Penerimaan"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
