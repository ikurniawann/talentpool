"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Supplier, RawMaterialWithStock, Unit, SupplierPriceListFormData } from "@/types/purchasing";
import { listSuppliers, listRawMaterials, listUnits, listPriceLists, updatePriceList } from "@/lib/purchasing";

export default function EditPriceListPage() {
  const router = useRouter();
  const params = useParams();
  const priceListId = params.id as string;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterialWithStock[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<SupplierPriceListFormData>({
    supplier_id: "",
    bahan_baku_id: "",
    harga: 0,
    satuan_id: "",
    minimum_qty: 1,
    lead_time_days: 0,
    is_preferred: false,
    berlaku_dari: "",
    berlaku_sampai: "",
    catatan: "",
  });

  useEffect(() => {
    loadData();
  }, [priceListId]);

  const loadData = async () => {
    try {
      const [suppliersData, materialsData, unitsData, priceListsData] = await Promise.all([
        listSuppliers({ is_active: true }),
        listRawMaterials({ limit: 100, is_active: true }),
        listUnits(true),
        listPriceLists({}),
      ]);
      setSuppliers(suppliersData);
      setMaterials(materialsData.data);
      setUnits(unitsData);

      const priceList = priceListsData.find(p => p.id === priceListId);
      if (priceList) {
        setFormData({
          supplier_id: priceList.supplier_id,
          bahan_baku_id: priceList.bahan_baku_id,
          harga: priceList.harga,
          satuan_id: priceList.satuan_id,
          minimum_qty: priceList.minimum_qty,
          lead_time_days: priceList.lead_time_days,
          is_preferred: priceList.is_preferred,
          berlaku_dari: priceList.berlaku_dari || "",
          berlaku_sampai: priceList.berlaku_sampai || "",
          catatan: priceList.catatan || "",
        });
      } else {
        toast.error("Price list tidak ditemukan");
        router.push("/dashboard/purchasing/price-list");
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      toast.error("Supplier wajib dipilih");
      return;
    }
    if (!formData.bahan_baku_id) {
      toast.error("Bahan baku wajib dipilih");
      return;
    }
    if (!formData.satuan_id) {
      toast.error("Satuan wajib dipilih");
      return;
    }
    if (!formData.harga || formData.harga <= 0) {
      toast.error("Harga wajib diisi dan harus lebih dari 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePriceList(priceListId, formData);
      toast.success("Price list berhasil diupdate");
      router.push(`/dashboard/purchasing/price-list/${priceListId}`);
    } catch (error: any) {
      console.error("Error updating price list:", error);
      toast.error(error.message || "Gagal mengupdate price list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (num: number) => {
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/purchasing/price-list/${priceListId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Price List</h1>
          <p className="text-muted-foreground">
            Edit harga supplier untuk bahan baku
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Supplier & Material */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Supplier & Bahan Baku
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Supplier <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.nama_supplier} ({supplier.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Bahan Baku <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.bahan_baku_id}
                  onValueChange={(v) => setFormData({ ...formData, bahan_baku_id: v })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih bahan baku" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.nama} - {material.kode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Satuan <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.satuan_id}
                  onValueChange={(v) => setFormData({ ...formData, satuan_id: v })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih satuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.nama} ({unit.kode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Harga per Unit <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.harga}
                  onChange={(e) =>
                    setFormData({ ...formData, harga: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Minimum Order Quantity (MOQ) <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="0.0001"
                  value={formData.minimum_qty}
                  onChange={(e) =>
                    setFormData({ ...formData, minimum_qty: parseFloat(e.target.value) || 1 })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Lead Time (hari)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.lead_time_days}
                  onChange={(e) =>
                    setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Estimasi waktu pengiriman dari order sampai barang datang
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_preferred"
                  checked={formData.is_preferred}
                  onChange={(e) =>
                    setFormData({ ...formData, is_preferred: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="is_preferred" className="cursor-pointer">
                  Preferred Supplier (harga prioritas)
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Validity Period */}
        <Card>
          <CardHeader>
            <CardTitle>Validity Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Berlaku Dari</Label>
                <Input
                  type="date"
                  value={formData.berlaku_dari}
                  onChange={(e) =>
                    setFormData({ ...formData, berlaku_dari: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Berlaku Sampai (opsional)</Label>
                <Input
                  type="date"
                  value={formData.berlaku_sampai}
                  onChange={(e) =>
                    setFormData({ ...formData, berlaku_sampai: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Kosongkan jika harga berlaku tanpa batas waktu
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Textarea
                value={formData.catatan}
                onChange={(e) =>
                  setFormData({ ...formData, catatan: e.target.value })
                }
                placeholder="Catatan tambahan (misal: syarat pembayaran, kondisi khusus, dll)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/dashboard/purchasing/price-list/${priceListId}`}>
            <Button variant="outline" type="button" disabled={isSubmitting}>
              Batal
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Update Price List"}
          </Button>
        </div>
      </form>
    </div>
  );
}
