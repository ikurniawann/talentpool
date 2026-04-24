"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, DollarSign, Calendar, Package } from "lucide-react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { Supplier, RawMaterialWithStock, Unit, SupplierPriceListFormData } from "@/types/purchasing";
import { listSuppliers, listRawMaterials, listUnits, createPriceList } from "@/lib/purchasing";

export default function NewPriceListPage() {
  const router = useRouter();
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
    berlaku_dari: new Date().toISOString().split("T")[0],
    berlaku_sampai: "",
    catatan: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [suppliersData, materialsData, unitsData] = await Promise.all([
        listSuppliers({ is_active: true }),
        listRawMaterials({ limit: 100, is_active: true }),
        listUnits(),
      ]);
      setSuppliers(suppliersData);
      setMaterials(materialsData.data);
      setUnits(unitsData.data || []);
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

    setIsSubmitting(true);
    try {
      await createPriceList(formData);
      toast.success("Price list berhasil ditambahkan");
      router.push("/dashboard/purchasing/price-list");
    } catch (error: any) {
      console.error("Error creating price list:", error);
      toast.error(error.message || "Gagal menambahkan price list");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-gray-500">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/purchasing/price-list">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Price List Baru</h1>
          <p className="text-sm text-gray-500">Isi detail harga supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Full Column Layout */}
        <div className="space-y-6">
          
          {/* Card 1: Supplier & Bahan Baku */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Supplier & Bahan Baku
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="supplier" className="text-xs">Supplier <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={suppliers.map((s) => ({ value: s.id, label: s.nama_supplier, description: s.kota }))}
                    value={formData.supplier_id}
                    onChange={(v) => setFormData({ ...formData, supplier_id: v })}
                    placeholder="Pilih supplier..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Supplier tidak ditemukan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bahan_baku" className="text-xs">Bahan Baku <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={materials.map((m) => ({ value: m.id, label: m.nama, description: m.kode }))}
                    value={formData.bahan_baku_id}
                    onChange={(v) => setFormData({ ...formData, bahan_baku_id: v })}
                    placeholder="Pilih bahan baku..."
                    searchPlaceholder="Cari..."
                    emptyMessage="Bahan baku tidak ditemukan"
                    allowClear
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="satuan" className="text-xs">Satuan <span className="text-red-500">*</span></Label>
                <Combobox
                  options={units.map((u) => ({ value: u.id, label: u.nama, description: u.kode }))}
                  value={formData.satuan_id}
                  onChange={(v) => setFormData({ ...formData, satuan_id: v })}
                  placeholder="Pilih satuan..."
                  searchPlaceholder="Cari..."
                  emptyMessage="Satuan tidak ditemukan"
                  allowClear
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Pricing & Terms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Harga & Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="harga" className="text-xs">Harga per Satuan <span className="text-red-500">*</span></Label>
                  <Input
                    id="harga"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.harga}
                    onChange={(e) => setFormData({ ...formData, harga: parseFloat(e.target.value) || 0 })}
                    placeholder="Rp 0"
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minimum_qty" className="text-xs">Minimum Qty</Label>
                  <Input
                    id="minimum_qty"
                    type="number"
                    min="1"
                    value={formData.minimum_qty}
                    onChange={(e) => setFormData({ ...formData, minimum_qty: parseFloat(e.target.value) || 1 })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead_time" className="text-xs">Lead Time (hari)</Label>
                  <Input
                    id="lead_time"
                    type="number"
                    min="0"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseFloat(e.target.value) || 0 })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Validity & Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Validity & Catatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="berlaku_dari" className="text-xs">Berlaku Dari</Label>
                  <Input
                    id="berlaku_dari"
                    type="date"
                    value={formData.berlaku_dari}
                    onChange={(e) => setFormData({ ...formData, berlaku_dari: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="berlaku_sampai" className="text-xs">Berlaku Sampai</Label>
                  <Input
                    id="berlaku_sampai"
                    type="date"
                    value={formData.berlaku_sampai}
                    onChange={(e) => setFormData({ ...formData, berlaku_sampai: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catatan" className="text-xs">Catatan</Label>
                <Textarea
                  id="catatan"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Catatan tambahan..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()} className="px-6">
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting} className="px-6">
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Menyimpan..." : "Simpan Price List"}
          </Button>
        </div>
      </form>
    </div>
  );
}
