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
import { ArrowLeft, Save, Plus, Trash2, Package, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import {
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceiptFormData,
  GoodsReceiptItemFormData,
} from "@/types/purchasing";
import {
  listPurchaseOrders,
  getPurchaseOrder,
  createGoodsReceipt,
  createGRNItem,
} from "@/lib/purchasing";

interface GRNItemForm extends Partial<GoodsReceiptItemFormData> {
  id: string;
  material_name?: string;
  material_code?: string;
  unit_name?: string;
  remaining_qty: number;
}

export default function NewGRNPage() {
  const router = useRouter();
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<GoodsReceiptFormData>({
    po_id: "",
    gudang_tujuan: "GUDANG UTAMA",
    kondisi_packing: "BAIK",
    catatan_penerimaan: "",
  });

  const [items, setItems] = useState<GRNItemForm[]>([]);

  useEffect(() => {
    loadPOs();
  }, []);

  const loadPOs = async () => {
    try {
      const response = await listPurchaseOrders({
        status: "SENT",
        limit: 100,
      });
      setPos(response.data.filter((po) => po.status === "SENT" || po.status === "PARTIAL"));
    } catch (error) {
      console.error("Error loading POs:", error);
      toast.error("Gagal memuat data PO");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPO = async (poId: string) => {
    if (!poId) {
      setSelectedPO(null);
      setPoItems([]);
      setItems([]);
      return;
    }

    try {
      const po = await getPurchaseOrder(poId);
      setSelectedPO(po);
      setPoItems(po.items || []);

      // Initialize items from PO
      const initialItems = (po.items || [])
        .filter((item) => item.qty_remaining > 0)
        .map((item) => ({
          id: crypto.randomUUID(),
          po_item_id: item.id,
          raw_material_id: item.raw_material_id,
          material_name: item.raw_material?.nama,
          material_code: item.raw_material?.kode,
          unit_name: item.satuan?.nama,
          satuan_id: item.satuan_id,
          harga_satuan: item.harga_satuan,
          remaining_qty: item.qty_remaining,
          qty_diterima: 0,
          qty_diterima_baik: 0,
          qty_cacat: 0,
        }));
      setItems(initialItems);
      setFormData((prev) => ({ ...prev, po_id: poId }));
    } catch (error) {
      console.error("Error loading PO details:", error);
      toast.error("Gagal memuat detail PO");
    }
  };

  const updateItem = (index: number, field: keyof GRNItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate good qty
    if (field === "qty_diterima") {
      newItems[index].qty_diterima_baik = value;
      newItems[index].qty_cacat = 0;
    }

    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.po_id) {
      toast.error("Pilih PO terlebih dahulu");
      return;
    }

    const validItems = items.filter((item) => item.qty_diterima > 0);
    if (validItems.length === 0) {
      toast.error("Tambahkan minimal 1 item yang diterima");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create GRN
      const grn = await createGoodsReceipt(formData);

      // Create GRN items
      for (const item of validItems) {
        await createGRNItem(grn.id, {
          po_item_id: item.po_item_id!,
          raw_material_id: item.raw_material_id!,
          qty_diterima: item.qty_diterima,
          qty_diterima_baik: item.qty_diterima_baik,
          qty_cacat: item.qty_cacat || 0,
          satuan_id: item.satuan_id,
          harga_satuan: item.harga_satuan || 0,
          lokasi_rak: item.lokasi_rak,
          catatan: item.catatan,
        });
      }

      toast.success("GRN berhasil dibuat");
      router.push(`/dashboard/purchasing/grn/${grn.id}`);
    } catch (error: any) {
      console.error("Error creating GRN:", error);
      toast.error(error.message || "Gagal membuat GRN");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalQty = items.reduce((sum, item) => sum + (item.qty_diterima || 0), 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/grn">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Buat GRN Baru</h1>
          <p className="text-muted-foreground">
            Catat penerimaan barang dari supplier
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GRN Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informasi Penerimaan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Purchase Order <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.po_id}
                  onValueChange={handleSelectPO}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih PO" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Pilih PO</SelectItem>
                    {pos.map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.nomor_po} - {po.supplier?.nama_supplier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPO && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="font-medium">{selectedPO.supplier?.nama_supplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tanggal PO:</span>
                    <span>{new Date(selectedPO.tanggal_po).toLocaleDateString("id-ID")}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gudang Tujuan</Label>
                  <Input
                    value={formData.gudang_tujuan}
                    onChange={(e) =>
                      setFormData({ ...formData, gudang_tujuan: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kondisi Packing</Label>
                  <Select
                    value={formData.kondisi_packing}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        kondisi_packing: v as "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIK">Baik</SelectItem>
                      <SelectItem value="RUSAK_RINGAN">Rusak Ringan</SelectItem>
                      <SelectItem value="RUSAK_BERAT">Rusak Berat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catatan Penerimaan</Label>
                <Textarea
                  value={formData.catatan_penerimaan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan_penerimaan: e.target.value })
                  }
                  placeholder="Catatan tambahan..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Item</span>
                <span className="font-medium">{items.filter((i) => i.qty_diterima > 0).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Qty</span>
                <span className="font-medium">{totalQty}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Item yang Diterima
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedPO ? (
              <div className="text-center py-8 text-muted-foreground">
                Pilih PO terlebih dahulu
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada item yang perlu diterima
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg"
                  >
                    <div className="col-span-4">
                      <div className="font-medium">{item.material_name}</div>
                      <div className="text-sm text-muted-foreground">{item.material_code}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Sisa PO: {item.remaining_qty} {item.unit_name}
                      </div>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty Diterima</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        max={item.remaining_qty}
                        value={item.qty_diterima}
                        onChange={(e) =>
                          updateItem(index, "qty_diterima", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Baik</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        max={item.qty_diterima}
                        value={item.qty_diterima_baik}
                        onChange={(e) =>
                          updateItem(index, "qty_diterima_baik", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Cacat</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={item.qty_cacat}
                        onChange={(e) =>
                          updateItem(index, "qty_cacat", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Lokasi Rak</Label>
                      <Input
                        value={item.lokasi_rak || ""}
                        onChange={(e) =>
                          updateItem(index, "lokasi_rak", e.target.value)
                        }
                        placeholder="Rak A-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/purchasing/grn">
            <Button variant="outline" disabled={isSubmitting}>
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || !selectedPO}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan GRN"}
          </Button>
        </div>
      </form>
    </div>
  );
}
