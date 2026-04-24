"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { BreadcrumbNav } from "@/modules/purchasing/components/breadcrumb/BreadcrumbNav";
import { createReturn, getReturnableItems } from "@/lib/purchasing/return";
import { listSuppliers } from "@/lib/purchasing";
import {
  RETURN_REASON_LABELS,
  ReturnReasonType,
  ReturnableItem,
} from "@/types/purchasing";
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/purchasing/utils";
import { toast } from "sonner";
import { Supplier } from "@/types/supplier";

interface ReturnItem extends ReturnableItem {
  selected: boolean;
  qty_return: number;
  condition_notes: string;
}

export default function NewReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grnId = searchParams.get("grn_id");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [returnableItems, setReturnableItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    grn_id: grnId || "",
    supplier_id: "",
    return_date: new Date().toISOString().split("T")[0],
    reason_type: "" as ReturnReasonType,
    reason_notes: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [grnId]);

  const loadData = async () => {
    try {
      const [suppliersData, itemsData] = await Promise.all([
        listSuppliers({ is_active: true }),
        grnId ? getReturnableItems(grnId) : Promise.resolve([]),
      ]);

      setSuppliers(suppliersData);
      
      // Map returnable items with selection state
      const mappedItems = itemsData.map((item: ReturnableItem) => ({
        ...item,
        selected: false,
        qty_return: 0,
        condition_notes: "",
      }));
      setReturnableItems(mappedItems);

      // Auto-select supplier if only one item
      if (itemsData.length > 0) {
        setFormData((prev) => ({
          ...prev,
          supplier_id: itemsData[0].supplier_id,
          grn_id: itemsData[0].grn_id,
        }));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (grnItemId: string) => {
    setReturnableItems((items) =>
      items.map((item) =>
        item.grn_item_id === grnItemId
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const updateQtyReturn = (grnItemId: string, qty: number) => {
    setReturnableItems((items) =>
      items.map((item) =>
        item.grn_item_id === grnItemId
          ? {
              ...item,
              qty_return: Math.min(qty, item.qty_available_to_return),
            }
          : item
      )
    );
  };

  const updateConditionNotes = (grnItemId: string, notes: string) => {
    setReturnableItems((items) =>
      items.map((item) =>
        item.grn_item_id === grnItemId
          ? { ...item, condition_notes: notes }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.supplier_id) {
      toast.error("Supplier wajib dipilih");
      return;
    }
    if (!formData.reason_type) {
      toast.error("Alasan return wajib dipilih");
      return;
    }

    const selectedItems = returnableItems.filter(
      (item) => item.selected && item.qty_return > 0
    );

    if (selectedItems.length === 0) {
      toast.error("Pilih minimal 1 item untuk di-return");
      return;
    }

    // Validate qty
    for (const item of selectedItems) {
      if (item.qty_return > item.qty_available_to_return) {
        toast.error(`Qty return ${item.raw_material_nama} melebihi yang tersedia`);
        return;
      }
      if (item.qty_return <= 0) {
        toast.error(`Qty return ${item.raw_material_nama} harus > 0`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const returnData = {
        grn_id: formData.grn_id,
        supplier_id: formData.supplier_id,
        return_date: formData.return_date,
        reason_type: formData.reason_type,
        reason_notes: formData.reason_notes,
        notes: formData.notes,
        items: selectedItems.map((item) => ({
          grn_item_id: item.grn_item_id,
          raw_material_id: item.raw_material_id,
          qty_returned: item.qty_return,
          unit_cost: item.unit_price,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          condition_notes: item.condition_notes,
        })),
      };

      await createReturn(returnData);
      toast.success("Return berhasil dibuat dan menunggu persetujuan");
      router.push("/dashboard/purchasing/returns");
    } catch (error: any) {
      console.error("Error creating return:", error);
      toast.error(error.message || "Gagal membuat return");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = returnableItems.filter((i) => i.selected).length;
  const totalQty = returnableItems
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + i.qty_return, 0);
  const totalAmount = returnableItems
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + i.qty_return * i.unit_price, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <BreadcrumbNav
        items={[
          { label: "Purchasing", href: "/dashboard/purchasing" },
          { label: "Retur Pembelian", href: "/dashboard/purchasing/returns" },
          { label: "Buat Return Baru" },
        ]}
      />

      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Buat Return Baru</h1>
          <p className="text-sm text-gray-500">
            Retur barang ke supplier
          </p>
        </div>
        <Link href="/dashboard/purchasing/returns">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Return Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi Return</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="return_date">Tanggal Return *</Label>
                    <Input
                      id="return_date"
                      type="date"
                      value={formData.return_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          return_date: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier_id">Supplier *</Label>
                    <Select
                      value={formData.supplier_id}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          supplier_id: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem
                            key={supplier.id}
                            value={supplier.id}
                          >
                            {supplier.nama_supplier}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason_type">Alasan Return *</Label>
                  <Select
                    value={formData.reason_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        reason_type: value as ReturnReasonType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih alasan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RETURN_REASON_LABELS).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason_notes">Catatan Alasan</Label>
                  <Textarea
                    id="reason_notes"
                    placeholder="Jelaskan alasan return secara detail..."
                    value={formData.reason_notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reason_notes: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Catatan Tambahan</Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan internal (opsional)..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pilih Item untuk Return</CardTitle>
              </CardHeader>
              <CardContent>
                {returnableItems.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-gray-400">
                    <AlertCircle className="w-12 h-12 mb-2" />
                    <p>Tidak ada item yang bisa di-return</p>
                    <p className="text-sm">
                      Pastikan GRN memiliki item dengan QC status rejected
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 w-10">
                            <input
                              type="checkbox"
                              checked={
                                selectedCount === returnableItems.length &&
                                returnableItems.length > 0
                              }
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setReturnableItems((items) =>
                                  items.map((item) => ({
                                    ...item,
                                    selected: checked,
                                  }))
                                );
                              }}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="text-left px-4 py-3">Bahan Baku</th>
                          <th className="text-right px-4 py-3">Qty Diterima</th>
                          <th className="text-right px-4 py-3">Sudah Return</th>
                          <th className="text-right px-4 py-3">Bisa Return</th>
                          <th className="text-right px-4 py-3 w-32">Qty Return</th>
                          <th className="text-left px-4 py-3">Kondisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {returnableItems.map((item) => (
                          <TableRow
                            key={item.grn_item_id}
                            className={item.selected ? "bg-pink-50" : ""}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => toggleItem(item.grn_item_id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{item.raw_material_nama}</p>
                                <p className="text-xs text-gray-500">
                                  {item.raw_material_kode}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.qty_diterima.toLocaleString()} {item.satuan || ""}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">
                              {item.qty_returned.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              {item.qty_available_to_return.toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="0"
                                max={item.qty_available_to_return}
                                value={
                                  item.selected ? item.qty_return || "" : ""
                                }
                                onChange={(e) =>
                                  updateQtyReturn(
                                    item.grn_item_id,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={!item.selected}
                                className="w-24 text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="text"
                                value={item.condition_notes}
                                onChange={(e) =>
                                  updateConditionNotes(
                                    item.grn_item_id,
                                    e.target.value
                                  )
                                }
                                disabled={!item.selected}
                                placeholder="Kondisi barang..."
                                className="text-xs"
                              />
                            </td>
                          </TableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-4">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Item Dipilih</span>
                    <span className="font-medium">{selectedCount} item</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Qty</span>
                    <span className="font-medium">
                      {totalQty.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Total Nilai</span>
                      <span className="font-bold text-pink-600">
                        {formatRupiah(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-xs text-yellow-800">
                      <p className="font-medium mb-1">Info Penting:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Return akan menunggu persetujuan Purchasing Manager</li>
                        <li>Stock inventory akan berkurang setelah approved</li>
                        <li>GRN akan diupdate dengan qty returned</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isSubmitting ||
                    selectedCount === 0 ||
                    totalQty <= 0
                  }
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Menyimpan..." : "Submit Return"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
