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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { GoodsReceipt, GoodsReceiptItem } from "@/types/purchasing";
import { listGoodsReceipts, listGRNItems, createReturn } from "@/lib/purchasing";
import { ReturnReason, ReturnResolution, ReturnFormData, ReturnItemFormData } from "@/types/purchasing";

const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: "CACAT", label: "Barang Cacat/Rusak" },
  { value: "KADALUARSA", label: "Kadaluarsa" },
  { value: "SALAH_KIRIM", label: "Salah Kirim" },
  { value: "KELEBIHAN", label: "Kelebihan Jumlah" },
  { value: "LAINNYA", label: "Lainnya" },
];

const RESOLUTION_OPTIONS: { value: ReturnResolution; label: string }[] = [
  { value: "REPLACEMENT", label: "Ganti Barang" },
  { value: "REFUND", label: "Refund/Pengembalian Dana" },
  { value: "CREDIT_NOTE", label: "Credit Note" },
];

interface SelectedItem extends ReturnItemFormData {
  tempId: string;
  raw_material_name?: string;
}

export default function NewReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceipt | null>(null);
  const [grnItems, setGrnItems] = useState<GoodsReceiptItem[]>([]);

  const [formData, setFormData] = useState<ReturnFormData>({
    grn_id: "",
    alasan_return: "CACAT",
    keterangan: "",
    jenis_resolusi: "REPLACEMENT",
  });

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Load GRN list (yang sudah completed)
  useEffect(() => {
    loadGRNs();
  }, []);

  async function loadGRNs() {
    try {
      const data = await listGoodsReceipts({ status: "COMPLETED" });
      setGrns(data);
    } catch (error) {
      toast.error("Gagal memuat data GRN");
    }
  }

  // Load GRN items when selected
  useEffect(() => {
    if (formData.grn_id) {
      loadGRNDetail(formData.grn_id);
    }
  }, [formData.grn_id]);

  async function loadGRNDetail(grnId: string) {
    try {
      const items = await listGRNItems(grnId);
      setGrnItems(items);
      // Auto-select all items with default return qty = 0
      const mappedItems: SelectedItem[] = items.map((item) => ({
        tempId: crypto.randomUUID(),
        grn_item_id: item.id,
        raw_material_id: item.raw_material_id,
        qty_return: 0,
        harga_satuan: item.harga_satuan,
        alasan_item: "",
        raw_material_name: item.raw_material?.nama_bahan || item.raw_material_id,
      }));
      setSelectedItems(mappedItems);
    } catch (error) {
      toast.error("Gagal memuat item GRN");
    }
  }

  function handleItemQtyChange(tempId: string, qty: number) {
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId ? { ...item, qty_return: Math.max(0, qty) } : item
      )
    );
  }

  function handleItemAlasanChange(tempId: string, alasan: string) {
    setSelectedItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, alasan_item: alasan } : item))
    );
  }

  const totalQty = selectedItems.reduce((sum, item) => sum + item.qty_return, 0);
  const totalNilai = selectedItems.reduce(
    (sum, item) => sum + item.qty_return * item.harga_satuan,
    0
  );

  async function handleSubmit() {
    // Validation
    if (!formData.grn_id) {
      toast.error("Pilih GRN terlebih dahulu");
      return;
    }

    const itemsToReturn = selectedItems.filter((item) => item.qty_return > 0);
    if (itemsToReturn.length === 0) {
      toast.error("Pilih minimal 1 item yang akan diretur");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        items: itemsToReturn.map(({ tempId, raw_material_name, ...item }) => item),
      };

      const result = await createReturn(payload);
      toast.success("Retur berhasil dibuat");
      router.push(`/dashboard/purchasing/returns/${result.id}`);
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat retur");
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
          { label: "Retur", href: "/dashboard/purchasing/returns" },
          { label: "Baru" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retur Baru</h1>
          <p className="text-sm text-gray-500">Buat pengembalian barang ke supplier</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/purchasing/returns">
            <Button variant="outline">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Batal
            </Button>
          </Link>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Retur"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Utama */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pilih GRN */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pilih Goods Receipt (GRN)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>GRN *</Label>
                <Select value={formData.grn_id} onValueChange={(v) => setFormData({ ...formData, grn_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih GRN" />
                  </SelectTrigger>
                  <SelectContent>
                    {grns.map((grn) => (
                      <SelectItem key={grn.id} value={grn.id}>
                        {grn.nomor_grn} - PO {grn.po?.nomor_po || grn.po_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Item yang Diretur */}
          {formData.grn_id && selectedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Item yang Diretur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedItems.map((item) => (
                    <div key={item.tempId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.raw_material_name}</span>
                        <Badge variant="outline">Rp {item.harga_satuan.toLocaleString("id-ID")}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Qty Retur *</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.0001"
                            value={item.qty_return}
                            onChange={(e) =>
                              handleItemQtyChange(item.tempId, parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Alasan Item</Label>
                          <Input
                            value={item.alasan_item || ""}
                            onChange={(e) => handleItemAlasanChange(item.tempId, e.target.value)}
                            placeholder="Opsional"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Retur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Alasan Return *</Label>
                <Select
                  value={formData.alasan_return}
                  onValueChange={(v) => setFormData({ ...formData, alasan_return: v as ReturnReason })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Jenis Resolusi *</Label>
                <Select
                  value={formData.jenis_resolusi}
                  onValueChange={(v) => setFormData({ ...formData, jenis_resolusi: v as ReturnResolution })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Keterangan</Label>
                <Textarea
                  value={formData.keterangan || ""}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ringkasan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Qty Retur</span>
                <span className="font-medium">{totalQty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Nilai</span>
                <span className="font-medium">Rp {totalNilai.toLocaleString("id-ID")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
