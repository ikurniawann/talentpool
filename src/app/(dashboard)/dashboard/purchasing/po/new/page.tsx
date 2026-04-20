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
import { ArrowLeft, Save, Plus, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { Supplier, RawMaterialWithStock, PurchaseOrderFormData, PurchaseOrderItemFormData, Unit } from "@/types/purchasing";
import { listSuppliers, listRawMaterials, listUnits, createPurchaseOrder, createPOItem } from "@/lib/purchasing";

interface POItemForm extends PurchaseOrderItemFormData {
  id: string;
  raw_material_name?: string;
  raw_material_unit?: string;
  subtotal: number;
}

export default function NewPOPage() {
  console.log("NewPOPage component mounted"); // DEBUG
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplier_id: "",
    tanggal_po: new Date().toISOString().split("T")[0],
    tanggal_kirim_estimasi: "",
    catatan: "",
    alamat_pengiriman: "",
    diskon_persen: 0,
    diskon_nominal: 0,
    ppn_persen: 11,
  });

  const [items, setItems] = useState<POItemForm[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log("loadData started"); // DEBUG
    try {
      // Load suppliers first
      let suppliersArray: Supplier[] = [];
      try {
        const suppliersRes = await listSuppliers();
        console.log("Suppliers raw response:", suppliersRes); // DEBUG
        suppliersArray = Array.isArray(suppliersRes) ? suppliersRes : suppliersRes.data || [];
        console.log("Suppliers array:", suppliersArray); // DEBUG
      } catch (e) {
        console.error("Error loading suppliers:", e);
      }
      setSuppliers(suppliersArray);
      
      // Load materials
      try {
        const materialsRes = await listRawMaterials({ limit: 100 });
        console.log("Materials response:", materialsRes); // DEBUG
        setMaterials(materialsRes.data || []);
      } catch (e) {
        console.error("Error loading materials:", e);
      }
      
      // Load units
      try {
        const unitsRes = await listUnits(true);
        console.log("Units response:", unitsRes); // DEBUG
        setUnits(unitsRes || []);
      } catch (e) {
        console.error("Error loading units:", e);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
      console.log("loadData finished"); // DEBUG
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        raw_material_id: "",
        qty_ordered: 1,
        harga_satuan: 0,
        diskon_item: 0,
        subtotal: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof POItemForm, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate subtotal
    if (field === "qty_ordered" || field === "harga_satuan" || field === "diskon_item") {
      const qty = field === "qty_ordered" ? value : newItems[index].qty_ordered;
      const price = field === "harga_satuan" ? value : newItems[index].harga_satuan;
      const discount = field === "diskon_item" ? value : newItems[index].diskon_item;
      newItems[index].subtotal = qty * price - discount;
    }

    // Update material info
    if (field === "raw_material_id") {
      const material = materials.find((m) => m.id === value);
      newItems[index].raw_material_name = material?.nama;
      newItems[index].raw_material_unit = material?.satuan_besar_nama;
      newItems[index].satuan_id = material?.satuan_besar_id;
    }

    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const diskonNominal = formData.diskon_persen
      ? (subtotal * formData.diskon_persen) / 100
      : formData.diskon_nominal || 0;
    const afterDiskon = subtotal - diskonNominal;
    const ppnNominal = (afterDiskon * (formData.ppn_persen || 11)) / 100;
    const total = afterDiskon + ppnNominal;

    return { subtotal, diskonNominal, ppnNominal, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_id) {
      toast.error("Pilih supplier terlebih dahulu");
      return;
    }
    if (items.length === 0) {
      toast.error("Tambahkan minimal 1 item");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create PO
      const po = await createPurchaseOrder(formData);

      // Create items
      for (const item of items) {
        await createPOItem(po.id, {
          raw_material_id: item.raw_material_id,
          qty_ordered: item.qty_ordered,
          satuan_id: item.satuan_id,
          harga_satuan: item.harga_satuan,
          diskon_item: item.diskon_item,
          catatan: item.catatan,
        });
      }

      toast.success("PO berhasil dibuat");
      router.push(`/dashboard/purchasing/po/${po.id}`);
    } catch (error: any) {
      console.error("Error creating PO:", error);
      toast.error(error.message || "Gagal membuat PO");
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, diskonNominal, ppnNominal, total } = calculateTotals();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/po">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Buat Purchase Order Baru</h1>
          <p className="text-muted-foreground">
            Buat PO baru untuk supplier
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informasi PO */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informasi Purchase Order
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Supplier <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(v) =>
                      setFormData({ ...formData, supplier_id: v })
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nama_supplier} ({s.kode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tanggal PO</Label>
                  <Input
                    type="date"
                    value={formData.tanggal_po}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_po: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Kirim Estimasi</Label>
                  <Input
                    type="date"
                    value={formData.tanggal_kirim_estimasi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tanggal_kirim_estimasi: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catatan</Label>
                <Textarea
                  value={formData.catatan}
                  onChange={(e) =>
                    setFormData({ ...formData, catatan: e.target.value })
                  }
                  placeholder="Catatan untuk supplier..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Alamat Pengiriman</Label>
                <Textarea
                  value={formData.alamat_pengiriman}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      alamat_pengiriman: e.target.value,
                    })
                  }
                  placeholder="Alamat pengiriman barang..."
                  rows={2}
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diskon</span>
                <span>Rp {diskonNominal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PPN ({formData.ppn_persen}%)</span>
                <span>Rp {ppnNominal.toLocaleString("id-ID")}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>Rp {total.toLocaleString("id-ID")}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Diskon (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.diskon_persen}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        diskon_persen: parseFloat(e.target.value) || 0,
                        diskon_nominal: 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">PPN (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.ppn_persen}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ppn_persen: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Item Purchase Order</CardTitle>
            <Button type="button" onClick={addItem} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg"
                >
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Bahan Baku *</Label>
                    <Select
                      value={item.raw_material_id}
                      onValueChange={(v) =>
                        updateItem(index, "raw_material_id", v)
                      }
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bahan" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nama} ({m.kode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Jumlah *</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={item.qty_ordered}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "qty_ordered",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Satuan</Label>
                    <Select
                      value={item.satuan_id || ""}
                      onValueChange={(v) =>
                        updateItem(index, "satuan_id", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Satuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Harga *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.harga_satuan}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "harga_satuan",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>

                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Subtotal</Label>
                    <div className="text-sm font-medium py-2">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  Belum ada item. Klik "Tambah Item" untuk memulai.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/purchasing/po">
            <Button variant="outline" disabled={isSubmitting}>
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan PO"}
          </Button>
        </div>
      </form>
    </div>
  );
}
