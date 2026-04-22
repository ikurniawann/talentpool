"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import {
  ClipboardDocumentCheckIcon,
  ArrowLeftIcon,
  TruckIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface GrnItem {
  id: string;
  grn_id?: string;
  purchase_order_item_id?: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_diterima: number;
  qty_ditolak: number;
  kondisi: "baik" | "rusak" | "cacat";
  catatan: string;
  satuan?: string;
}

interface POItem {
  id: string;
  raw_material_id: string;
  nama_bahan: string;
  qty_ordered: number;
  qty_received: number;
  satuan?: string;
}

interface GRNData {
  id: string;
  nomor_grn: string;
  delivery_id: string;
  po_id: string;
  po_number: string;
  supplier_name: string;
  no_surat_jalan: string;
  tanggal_penerimaan: string;
  status: string;
  catatan: string;
  items: GrnItem[];
}

export default function ContinueGrnPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const grnId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grnData, setGrnData] = useState<GRNData | null>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [grnItems, setGrnItems] = useState<GrnItem[]>([]);
  const [formData, setFormData] = useState({
    tanggal_penerimaan: "",
    catatan: "",
  });

  useEffect(() => {
    if (grnId) {
      fetchGrnData();
    }
  }, [grnId]);

  async function fetchGrnData() {
    setLoading(true);
    try {
      // Fetch GRN detail
      const res = await fetch(`/api/purchasing/grn/${grnId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Gagal memuat data GRN");
      }

      const grn = data.data;
      setGrnData(grn);
      setFormData({
        tanggal_penerimaan: grn.tanggal_penerimaan || new Date().toISOString().split("T")[0],
        catatan: grn.catatan || "",
      });

      // Initialize GRN items with existing data
      if (grn.items && grn.items.length > 0) {
        console.log("=== GRN ITEMS ===");
        console.log("GRN Items:", grn.items);
        
        const mappedItems = grn.items.map((item: any) => {
          console.log("Mapping GRN item:", {
            id: item.id,
            purchase_order_item_id: item.purchase_order_item_id,
            raw_material_id: item.raw_material_id,
            qty_diterima: item.qty_diterima,
          });
          
          return {
            id: item.id,
            grn_id: item.grn_id,
            purchase_order_item_id: item.purchase_order_item_id,
            raw_material_id: item.raw_material_id,
            nama_bahan: item.raw_material?.nama || item.nama_bahan || "Unknown",
            qty_diterima: item.qty_diterima || 0,
            qty_ditolak: item.qty_ditolak || 0,
            kondisi: item.kondisi || "baik",
            catatan: item.catatan || "",
            satuan: item.satuan?.nama || item.satuan?.nama_satuan || "pcs",
          };
        });
        
        setGrnItems(mappedItems);
        
        // After loading GRN items, try to enrich with PO data
        if (grn.po_id) {
          await fetchPOItems(grn.po_id);
        }
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Gagal memuat data GRN",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPOItems(poId: string) {
    try {
      // Try fetch from PO API first
      const res = await fetch(`/api/purchasing/po/${poId}`);
      const data = await res.json();

      console.log("=== FETCH PO ITEMS ===");
      console.log("PO ID:", poId);
      console.log("Response:", data);

      if (data.data?.items && data.data.items.length > 0) {
        const items = data.data.items.map((item: any) => ({
          id: item.id,
          raw_material_id: item.raw_material_id,
          nama_bahan: item.raw_material?.nama || item.raw_material?.nama_bahan || "Unknown",
          qty_ordered: item.qty_ordered || 0,
          qty_received: item.qty_received || 0,
          satuan: item.satuan?.nama || item.satuan?.nama_satuan || "pcs",
        }));
        console.log("Mapped PO Items:", items);
        setPoItems(items);
        return;
      }

      // Fallback: Fetch purchase_order_items directly
      console.warn("No items in PO response, fetching directly from purchase_order_items...");
      const directRes = await fetch(`/api/purchasing/po-items?po_id=${poId}`);
      const directData = await directRes.json();
      
      if (directData.data && directData.data.length > 0) {
        const items = directData.data.map((item: any) => ({
          id: item.id,
          raw_material_id: item.raw_material_id,
          nama_bahan: item.raw_material?.nama || item.raw_material?.nama_bahan || "Unknown",
          qty_ordered: item.qty_ordered || 0,
          qty_received: item.qty_received || 0,
          satuan: item.satuan?.nama || item.satuan?.nama_satuan || "pcs",
        }));
        console.log("Direct fetched PO Items:", items);
        setPoItems(items);
      } else {
        console.warn("No PO items found even with direct fetch");
      }
    } catch (e) {
      console.error("Failed to fetch PO items:", e);
      // Fallback: PO items will be empty, but GRN items already loaded
    }
  }

  function updateGrnItem(index: number, field: keyof GrnItem, value: any) {
    setGrnItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function getRemainingQty(poItemId: string): number {
    const poItem = poItems.find((p) => p.id === poItemId);
    if (!poItem) return 0;

    const grnItem = grnItems.find((g) => g.purchase_order_item_id === poItemId);
    const alreadyReceivedInThisGrn = grnItem?.qty_diterima || 0;

    return poItem.qty_ordered - poItem.qty_received - alreadyReceivedInThisGrn;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate
      const validItems = grnItems.filter(
        (item) => item.qty_diterima > 0 || item.qty_ditolak > 0
      );
      if (validItems.length === 0) {
        toast({
          title: "Error",
          description: "Minimal 1 item harus diisi",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Calculate totals
      const totalDiterima = validItems.reduce((sum, item) => sum + item.qty_diterima, 0);
      const totalDitolak = validItems.reduce((sum, item) => sum + item.qty_ditolak, 0);

      // Determine new status
      let newStatus = "pending";
      const totalOrdered = poItems.reduce((sum, item) => sum + item.qty_ordered, 0);
      const totalAlreadyReceived = poItems.reduce((sum, item) => sum + item.qty_received, 0);
      const newTotalReceived = totalAlreadyReceived + totalDiterima;

      if (totalDiterima === 0 && totalDitolak > 0) {
        newStatus = "rejected";
      } else if (newTotalReceived >= totalOrdered && totalDitolak === 0) {
        newStatus = "received";
      } else if (totalDiterima > 0) {
        newStatus = "partially_received";
      }

      const payload = {
        status: newStatus,
        catatan: formData.catatan,
        items: validItems.map((item) => ({
          id: item.id,
          grn_id: grnId,
          purchase_order_item_id: item.purchase_order_item_id,
          raw_material_id: item.raw_material_id,
          qty_diterima: item.qty_diterima,
          qty_ditolak: item.qty_ditolak,
          kondisi: item.kondisi,
          catatan: item.catatan || null,
        })),
      };

      console.log("=== UPDATE GRN ===");
      console.log("Payload:", payload);

      const res = await fetch(`/api/purchasing/grn/${grnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("API Response:", res.status, data);

      if (res.ok) {
        toast({
          title: "✅ Berhasil",
          description: `GRN ${grnData?.nomor_grn || ""} berhasil diupdate`,
        });
        router.push("/dashboard/purchasing/grn/continue");
        router.refresh();
      } else {
        throw new Error(data.error?.message || data.message || "Gagal mengupdate GRN");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Gagal mengupdate GRN",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-gray-500">Memuat data GRN...</div>
      </div>
    );
  }

  if (!grnData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 text-red-500">GRN tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Penerimaan", href: "/dashboard/purchasing/grn" },
          { label: "Lanjutkan GRN", href: "/dashboard/purchasing/grn/continue" },
          { label: grnData.nomor_grn },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/grn/continue">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lanjutkan Penerimaan Barang</h1>
          <p className="text-sm text-gray-500">{grnData.nomor_grn}</p>
        </div>
      </div>

      {/* GRN Info Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-5 h-5" />
            Informasi GRN
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Nomor GRN</Label>
            <p className="font-medium">{grnData.nomor_grn}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Supplier</Label>
            <p className="font-medium">{grnData.supplier_name || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">No. PO</Label>
            <p className="font-medium">{grnData.po_number || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">No. Surat Jalan</Label>
            <p className="font-medium">{grnData.no_surat_jalan || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Status</Label>
            <Badge
              className={
                grnData.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-orange-100 text-orange-800"
              }
            >
              {grnData.status === "pending" ? "Menunggu" : "Diterima Sebagian"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GRN Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TruckIcon className="w-5 h-5" />
              Update Informasi Penerimaan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
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
            </div>
            <div className="space-y-2">
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
            <CardTitle className="text-lg">Update Detail Item Diterima</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Masukkan qty yang diterima pada pengiriman ini. Sisa yang belum diterima akan tetap
              terbuka untuk penerimaan berikutnya.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Bahan Baku
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                      Qty Order
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                      Sudah Terima
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                      Sisa
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                      Qty Diterima *
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                      Qty Ditolak
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">
                      Kondisi
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grnItems.map((item, index) => {
                    // Try to find PO item by purchase_order_item_id first
                    let poItem = poItems.find((p) => p.id === item.purchase_order_item_id);
                    
                    // Fallback: match by raw_material_id if purchase_order_item_id is null
                    if (!poItem && item.raw_material_id) {
                      console.log(`[Fallback] Matching by raw_material_id: ${item.raw_material_id}`);
                      poItem = poItems.find((p) => p.raw_material_id === item.raw_material_id);
                    }
                    
                    const qtyOrdered = poItem?.qty_ordered || 0;
                    const qtyReceived = poItem?.qty_received || 0;
                    const alreadyReceivedInThisGrn = item.qty_diterima || 0;
                    const remaining = Math.max(0, qtyOrdered - qtyReceived - alreadyReceivedInThisGrn);
                    
                    console.log(`[Item ${index}]`, {
                      nama: item.nama_bahan,
                      purchase_order_item_id: item.purchase_order_item_id,
                      raw_material_id: item.raw_material_id,
                      qtyOrdered,
                      qtyReceived,
                      alreadyReceivedInThisGrn,
                      remaining,
                      poItemId: poItem?.id,
                    });
                    
                    return (
                      <tr key={item.id}>
                        <td className="py-3 px-4">
                          <p className="font-medium">{item.nama_bahan}</p>
                          <p className="text-xs text-gray-500">
                            Satuan: {poItem?.satuan || item.satuan || "pcs"}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center font-medium">{qtyOrdered}</td>
                        <td className="py-3 px-4 text-center text-blue-600 font-medium">
                          {qtyReceived}
                        </td>
                        <td className="py-3 px-4 text-center text-orange-600 font-medium">
                          {remaining}
                        </td>
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

        <div className="flex justify-between items-center">
          <Link href="/dashboard/purchasing/grn/continue">
            <Button type="button" variant="outline">
              Batal
            </Button>
          </Link>
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
